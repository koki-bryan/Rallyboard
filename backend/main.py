from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://postgres:postgres@localhost:5432/rankings')
FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default='player')

class LoginSession(Base):
    __tablename__ = 'login_sessions'
    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Event(Base):
    __tablename__ = 'events'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    best_of: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default='active')
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Participant(Base):
    __tablename__ = 'participants'
    __table_args__ = (UniqueConstraint('event_id', 'user_id'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey('events.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))

class Match(Base):
    __tablename__ = 'matches'
    __table_args__ = (UniqueConstraint('event_id', 'player1_id', 'player2_id'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey('events.id'))
    player1_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    player2_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    winner_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    submitted_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='pending')
    sets: Mapped[list[SetScore]] = relationship(back_populates='match', cascade='all, delete-orphan', order_by='SetScore.number')

class SetScore(Base):
    __tablename__ = 'set_scores'
    __table_args__ = (UniqueConstraint('match_id', 'number'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'))
    number: Mapped[int] = mapped_column(Integer)
    player1_points: Mapped[int] = mapped_column(Integer)
    player2_points: Mapped[int] = mapped_column(Integer)
    match: Mapped[Match] = relationship(back_populates='sets')

class Audit(Base):
    __tablename__ = 'match_audit'
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'))
    actor_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(20))
    snapshot: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

app = FastAPI(title='Table Tennis Rankings')
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def initialize():
    Base.metadata.create_all(engine)

def db_session(request: Request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        origin = request.headers.get('origin')
        if origin and origin != FRONTEND_ORIGIN:
            raise HTTPException(403, 'Invalid origin')
    with SessionLocal() as db:
        yield db

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return salt.hex() + ':' + digest.hex()

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split(':')
        calculated = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(calculated, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False

def current_user(rankings_session: str | None = Cookie(None), db: Session = Depends(db_session)) -> User | None:
    if not rankings_session:
        return None
    token_hash = hashlib.sha256(rankings_session.encode()).hexdigest()
    login = db.scalar(select(LoginSession).where(LoginSession.token_hash == token_hash))
    if not login or login.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return db.get(User, login.user_id)

def require_user(user: User | None = Depends(current_user)) -> User:
    if not user:
        raise HTTPException(401, 'Sign in required')
    return user

def require_coach(user: User = Depends(require_user)) -> User:
    if user.role not in ('coach', 'admin'):
        raise HTTPException(403, 'Coach access required')
    return user

def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != 'admin':
        raise HTTPException(403, 'Admin access required')
    return user

def user_data(user: User):
    return {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}

class Credentials(BaseModel):
    email: str
    password: str

class Signup(Credentials):
    name: str = Field(min_length=1, max_length=100)

class EventIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    best_of: Literal[3, 5, 7]
    player_ids: list[int] = Field(min_length=2)

class ResultIn(BaseModel):
    sets: list[tuple[int, int]] = Field(min_length=2, max_length=7)

class RoleIn(BaseModel):
    role: Literal['player', 'coach']

@app.post('/api/v1/auth/signup')
def signup(data: Signup, response: Response, db: Session = Depends(db_session)):
    email = data.email.strip().lower()
    if '@' not in email or len(data.password) < 8:
        raise HTTPException(422, 'Valid email and password of at least 8 characters required')
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, 'Email already registered')
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.flush()
    issue_session(db, response, user)
    db.commit()
    return user_data(user)

@app.post('/api/v1/auth/login')
def login(data: Credentials, response: Response, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, 'Invalid credentials')
    issue_session(db, response, user)
    db.commit()
    return user_data(user)

def issue_session(db: Session, response: Response, user: User):
    token = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=datetime.now(timezone.utc) + timedelta(days=14)))
    response.set_cookie('rankings_session', token, httponly=True, secure=COOKIE_SECURE, samesite='lax', max_age=14*24*3600, path='/api')

@app.post('/api/v1/auth/logout')
def logout(response: Response, rankings_session: str | None = Cookie(None), db: Session = Depends(db_session)):
    if rankings_session:
        login = db.scalar(select(LoginSession).where(LoginSession.token_hash == hashlib.sha256(rankings_session.encode()).hexdigest()))
        if login:
            db.delete(login)
            db.commit()
    response.delete_cookie('rankings_session', path='/api')
    return {'ok': True}

@app.get('/api/v1/auth/me')
def me(user: User | None = Depends(current_user)):
    return user_data(user) if user else None

@app.get('/api/v1/users')
def users(db: Session = Depends(db_session), _: User = Depends(require_coach)):
    return [user_data(u) for u in db.scalars(select(User).order_by(User.name))]

@app.patch('/api/v1/users/{user_id}/role')
def change_role(user_id: int, data: RoleIn, db: Session = Depends(db_session), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user or user.id == admin.id:
        raise HTTPException(404, 'User unavailable')
    user.role = data.role
    db.commit()
    return user_data(user)

@app.get('/api/v1/events')
def events(db: Session = Depends(db_session)):
    return [{'id': e.id, 'name': e.name, 'best_of': e.best_of, 'status': e.status} for e in db.scalars(select(Event).order_by(Event.id.desc()))]

@app.post('/api/v1/events')
def create_event(data: EventIn, db: Session = Depends(db_session), coach: User = Depends(require_coach)):
    ids = sorted(set(data.player_ids))
    if len(ids) != len(data.player_ids):
        raise HTTPException(422, 'Duplicate players')
    if len(db.scalars(select(User).where(User.id.in_(ids))).all()) != len(ids):
        raise HTTPException(422, 'Unknown player')
    event = Event(name=data.name.strip(), best_of=data.best_of, created_by=coach.id)
    db.add(event)
    db.flush()
    for player_id in ids:
        db.add(Participant(event_id=event.id, user_id=player_id))
    for i, player1 in enumerate(ids):
        for player2 in ids[i+1:]:
            db.add(Match(event_id=event.id, player1_id=player1, player2_id=player2))
    db.commit()
    return {'id': event.id}

def match_data(match: Match, names: dict[int, str]):
    return {'id': match.id, 'player1_id': match.player1_id, 'player2_id': match.player2_id,
            'player1': names[match.player1_id], 'player2': names[match.player2_id],
            'winner_id': match.winner_id, 'status': match.status, 'submitted_by': match.submitted_by,
            'submitted_at': match.submitted_at, 'sets': [[s.player1_points, s.player2_points] for s in match.sets]}

def snapshot(match: Match) -> str:
    import json
    return json.dumps({'status': match.status, 'winner_id': match.winner_id, 'submitted_by': match.submitted_by,
                       'sets': [[s.player1_points, s.player2_points] for s in match.sets]})

def standings(ids: list[int], names: dict[int, str], matches: list[Match]):
    stats = {i: {'player_id': i, 'name': names[i], 'played': 0, 'wins': 0, 'losses': 0,
                 'sets_won': 0, 'sets_lost': 0, 'points_won': 0, 'points_lost': 0} for i in ids}
    for match in matches:
        if match.status != 'completed':
            continue
        a, b = stats[match.player1_id], stats[match.player2_id]
        a['played'] += 1; b['played'] += 1
        a['wins' if match.winner_id == match.player1_id else 'losses'] += 1
        b['wins' if match.winner_id == match.player2_id else 'losses'] += 1
        for s in match.sets:
            a['points_won'] += s.player1_points; a['points_lost'] += s.player2_points
            b['points_won'] += s.player2_points; b['points_lost'] += s.player1_points
            a['sets_won' if s.player1_points > s.player2_points else 'sets_lost'] += 1
            b['sets_won' if s.player2_points > s.player1_points else 'sets_lost'] += 1
    rows = list(stats.values())
    def key(row):
        return (row['wins'], row['sets_won']-row['sets_lost'], row['points_won']-row['points_lost'])
    rows.sort(key=key, reverse=True)
    # Head to head applies only where exactly two players share all numeric tie breakers.
    i = 0
    while i < len(rows):
        j = i + 1
        while j < len(rows) and key(rows[j]) == key(rows[i]): j += 1
        if j-i == 2:
            direct = next((m for m in matches if m.status == 'completed' and {m.player1_id, m.player2_id} == {rows[i]['player_id'], rows[i+1]['player_id']}), None)
            if direct and direct.winner_id == rows[i+1]['player_id']:
                rows[i], rows[i+1] = rows[i+1], rows[i]
        i = j
    for i, row in enumerate(rows):
        row['set_difference'] = row['sets_won']-row['sets_lost']
        row['point_difference'] = row['points_won']-row['points_lost']
        if i == 0: row['rank'] = 1
        else:
            prev = rows[i-1]
            tied = key(row) == key(prev)
            direct = next((m for m in matches if m.status == 'completed' and {m.player1_id, m.player2_id} == {row['player_id'], prev['player_id']}), None)
            row['rank'] = prev['rank'] if tied and (not direct or len([r for r in rows if key(r)==key(row)]) > 2) else i+1
    return rows

@app.get('/api/v1/events/{event_id}')
def event_detail(event_id: int, db: Session = Depends(db_session)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, 'Event not found')
    ids = db.scalars(select(Participant.user_id).where(Participant.event_id == event_id)).all()
    names = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(ids)))}
    matches = db.scalars(select(Match).where(Match.event_id == event_id).order_by(Match.id)).all()
    return {'id': event.id, 'name': event.name, 'best_of': event.best_of, 'status': event.status,
            'standings': standings(ids, names, matches), 'matches': [match_data(m, names) for m in matches]}

def validate_result(data: ResultIn, match: Match, best_of: int):
    target = best_of // 2 + 1
    if len(data.sets) < target or len(data.sets) > best_of:
        raise HTTPException(422, 'Invalid number of sets')
    wins = [0, 0]
    for index, (a, b) in enumerate(data.sets):
        if min(a, b) < 0 or max(a, b) < 11 or (max(a, b) == 11 and abs(a-b) < 2) or (max(a, b) > 11 and abs(a-b) != 2):
            raise HTTPException(422, f'Invalid score in set {index+1}')
        wins[0 if a>b else 1] += 1
        if max(wins) == target and index != len(data.sets)-1:
            raise HTTPException(422, 'Match continued after deciding set')
    if max(wins) != target:
        raise HTTPException(422, 'No match winner')
    return match.player1_id if wins[0] == target else match.player2_id

def save_result(db: Session, match: Match, data: ResultIn, actor: User, action: str):
    event = db.get(Event, match.event_id)
    winner = validate_result(data, match, event.best_of)
    db.add(Audit(match_id=match.id, actor_id=actor.id, action=action, snapshot=snapshot(match)))
    match.sets.clear()
    db.flush()
    for i, (a,b) in enumerate(data.sets, 1):
        match.sets.append(SetScore(number=i, player1_points=a, player2_points=b))
    match.winner_id = winner
    match.status = 'completed'
    if action == 'before_submission':
        match.submitted_by = actor.id
        match.submitted_at = datetime.now(timezone.utc)
    db.flush()
    db.add(Audit(match_id=match.id, actor_id=actor.id, action='new_result', snapshot=snapshot(match)))
    remaining = db.scalar(select(Match.id).where(Match.event_id == event.id, Match.status == 'pending').limit(1))
    event.status = 'complete' if remaining is None else 'active'
    db.commit()
    return {'ok': True}

@app.post('/api/v1/matches/{match_id}/result')
def submit_result(match_id: int, data: ResultIn, db: Session = Depends(db_session), user: User = Depends(require_user)):
    match = db.scalar(select(Match).where(Match.id == match_id).with_for_update())
    if not match: raise HTTPException(404, 'Match not found')
    if match.status == 'completed': raise HTTPException(409, 'Result already submitted')
    return save_result(db, match, data, user, 'before_submission')

@app.put('/api/v1/matches/{match_id}/result')
def correct_result(match_id: int, data: ResultIn, db: Session = Depends(db_session), user: User = Depends(require_coach)):
    match = db.get(Match, match_id)
    if not match: raise HTTPException(404, 'Match not found')
    return save_result(db, match, data, user, 'before_correction')

@app.delete('/api/v1/matches/{match_id}/result')
def void_result(match_id: int, db: Session = Depends(db_session), user: User = Depends(require_coach)):
    match = db.get(Match, match_id)
    if not match: raise HTTPException(404, 'Match not found')
    if match.status != 'completed': raise HTTPException(409, 'No result to void')
    db.add(Audit(match_id=match.id, actor_id=user.id, action='before_void', snapshot=snapshot(match)))
    match.sets.clear(); match.winner_id = None; match.status = 'pending'; match.submitted_by = None; match.submitted_at = None
    db.get(Event, match.event_id).status = 'active'
    db.commit()
    return {'ok': True}

@app.get('/api/v1/matches/{match_id}/audit')
def match_audit(match_id: int, db: Session = Depends(db_session), _: User = Depends(require_coach)):
    if not db.get(Match, match_id): raise HTTPException(404, 'Match not found')
    return [{'action': a.action, 'actor_id': a.actor_id, 'snapshot': a.snapshot, 'created_at': a.created_at}
            for a in db.scalars(select(Audit).where(Audit.match_id == match_id).order_by(Audit.id))]

def bootstrap_admin():
    if len(sys.argv) != 5:
        raise SystemExit('Usage: python main.py bootstrap-admin NAME EMAIL PASSWORD')
    Base.metadata.create_all(engine)
    _, _, name, email, password = sys.argv
    if len(password) < 8: raise SystemExit('Password must have at least 8 characters')
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email.lower())): raise SystemExit('Email already exists')
        db.add(User(name=name, email=email.lower(), password_hash=hash_password(password), role='admin'))
        db.commit()

if __name__ == '__main__' and sys.argv[1:2] == ['bootstrap-admin']:
    bootstrap_admin()
