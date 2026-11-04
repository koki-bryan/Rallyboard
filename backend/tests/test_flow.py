import os
import tempfile
import unittest
import uuid
from unittest.mock import patch
from fastapi import Response
from sqlalchemy import create_engine, inspect, text

file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
file.close()
os.environ['DATABASE_URL'] = 'sqlite:///' + file.name
import main
from sqlalchemy import event as sqlalchemy_event

@sqlalchemy_event.listens_for(main.engine, 'connect')
def enforce_foreign_keys(connection, _):
    connection.execute('PRAGMA foreign_keys=ON')

main.engine.dispose()

class FlowTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        main.engine.dispose()
        os.unlink(file.name)

    def setUp(self):
        main.Base.metadata.drop_all(main.engine)
        main.Base.metadata.create_all(main.engine)
        self.db = main.SessionLocal()
        self.players = [main.User(name=n, email=n.lower()+'@example.com', password_hash='test') for n in ('Floyd','Sean','Coach')]
        self.db.add_all(self.players)
        self.db.commit()
        self.event = main.Event(name='Club', best_of=5, created_by=self.players[2].id)
        self.db.add(self.event)
        self.db.commit()
        self.match = main.Match(event_id=self.event.id, player1_id=self.players[0].id, player2_id=self.players[1].id)
        self.db.add(self.match)
        self.db.commit()

    def tearDown(self): self.db.close()

    def event_row(self, public_id):
        return self.db.query(main.Event).filter_by(public_id=str(public_id)).one()

    def test_event_password_unlocks_score_entry_for_non_player(self):
        scorer = main.User(name='Scorekeeper', email='score@example.com', password_hash='test')
        self.db.add(scorer)
        self.db.commit()
        self.players[2].role = 'coach'
        self.db.commit()
        created = main.create_event(main.EventIn(name='New event', best_of=5, event_password='clubsecret'),
            self.db, self.players[2])
        event_id = created['id']
        self.assertEqual(str(uuid.UUID(event_id)), event_id)
        self.assertNotEqual(str(self.event_row(event_id).id), event_id)
        self.assertEqual(self.db.query(main.Match).filter_by(event_id=self.event_row(event_id).id).count(), 0)
        main.add_player(event_id, main.AddPlayerIn(name='Floyd'), self.db, self.players[2])
        main.add_player(event_id, main.AddPlayerIn(name='Sean'), self.db, self.players[2])
        self.assertEqual(main.generate_schedule(event_id, self.db, self.players[2]), {'matches': 1})
        fixture = self.db.query(main.Match).filter_by(event_id=self.event_row(event_id).id).one()
        result = main.ResultIn(sets=[(11, 2), (11, 3), (11, 4)])
        with self.assertRaises(main.HTTPException) as denied:
            main.submit_result(fixture.id, result, self.db, scorer)
        self.assertEqual(denied.exception.status_code, 403)
        with self.assertRaises(main.HTTPException) as wrong:
            main.join_event(event_id, main.EventPasswordIn(password='wrongpassword'), self.db, scorer)
        self.assertEqual(wrong.exception.status_code, 403)
        self.assertEqual(main.join_event(event_id, main.EventPasswordIn(password='clubsecret'), self.db, scorer), {'can_score': True})
        self.assertEqual(main.submit_result(fixture.id, result, self.db, scorer), {'ok': True})
        self.assertEqual(fixture.submitted_by, scorer.id)
        self.assertEqual(len(self.db.query(main.Participant).filter_by(event_id=self.event_row(event_id).id).all()), 2)

    def test_event_details_require_sign_in_and_password(self):
        coach = self.players[2]
        coach.role = 'coach'
        self.db.commit()
        created = main.create_event(main.EventIn(name='Private event', best_of=5, event_password='clubsecret'), self.db, coach)
        event_id = created['id']
        member = self.players[0]
        with self.assertRaises(main.HTTPException) as anonymous:
            main.event_detail(event_id, self.db, None)
        self.assertEqual(anonymous.exception.status_code, 401)
        with self.assertRaises(main.HTTPException) as locked:
            main.event_detail(event_id, self.db, member)
        self.assertEqual(locked.exception.status_code, 403)
        self.assertEqual(main.events(self.db, None)[0], {'id': event_id, 'name': 'Private event'})
        self.assertIn('matches', main.event_detail(event_id, self.db, coach))
        main.join_event(event_id, main.EventPasswordIn(password='clubsecret'), self.db, member)
        self.assertIn('matches', main.event_detail(event_id, self.db, member))
        main.set_event_password(event_id, main.EventPasswordIn(password='newsecret'), self.db, coach)
        with self.assertRaises(main.HTTPException) as revoked:
            main.event_detail(event_id, self.db, member)
        self.assertEqual(revoked.exception.status_code, 403)

    def test_email_edit_and_account_deletion_preserve_results_anonymously(self):
        player = self.players[0]
        player.password_hash = main.hash_password('old-password')
        self.db.add(main.Participant(event_id=self.event.id, user_id=player.id))
        self.db.commit()
        main.save_result(self.db, self.match, main.ResultIn(sets=[(11, 2), (11, 3), (11, 4)]), player, 'before_submission')
        with self.assertRaises(main.HTTPException) as wrong:
            main.update_email(main.EmailIn(email='new@example.com', password='wrong'), self.db, player)
        self.assertEqual(wrong.exception.status_code, 403)
        self.assertEqual(main.update_email(main.EmailIn(email='new@example.com', password='old-password'), self.db, player)['email'], 'new@example.com')
        old_id = player.id
        self.assertEqual(main.delete_account(main.DeleteAccountIn(password='old-password'), Response(), self.db, player), {'ok': True})
        self.assertIsNone(self.db.get(main.User, old_id))
        former_id = self.db.query(main.Participant).filter_by(event_id=self.event.id).one().user_id
        former = self.db.get(main.User, former_id)
        self.assertEqual(former.role, 'guest')
        self.assertEqual(self.db.get(main.Match, self.match.id).winner_id, former_id)
        self.assertEqual(self.db.get(main.Match, self.match.id).submitted_by, former_id)
        self.assertEqual(self.db.query(main.Audit).filter_by(actor_id=former_id).count(), 2)

    def test_random_round_robin_covers_pairs_without_round_conflicts(self):
        for count in (2, 3, 4, 5, 6):
            schedule = main.round_robin_schedule(list(range(count)))
            pairs = {(a, b) for _, a, b in schedule}
            self.assertEqual(len(schedule), count * (count - 1) // 2)
            self.assertEqual(len(pairs), len(schedule))
            for round_number in {r for r, _, _ in schedule}:
                players = [p for r, a, b in schedule if r == round_number for p in (a, b)]
                self.assertEqual(len(players), len(set(players)))

    def test_losses_break_win_tie_before_sets_and_points(self):
        names = {1: 'Martin', 2: 'Jane', 3: 'Alex', 4: 'Blair', 5: 'Casey'}
        def completed(a, b, scores):
            wins_a = sum(left > right for left, right in scores)
            wins_b = len(scores) - wins_a
            match = main.Match(event_id=1, player1_id=a, player2_id=b,
                winner_id=a if wins_a > wins_b else b, status='completed')
            match.sets = [main.SetScore(number=i, player1_points=left, player2_points=right)
                          for i, (left, right) in enumerate(scores, 1)]
            return match
        matches = [
            completed(1, 3, [(11, 2), (11, 2), (11, 2)]),
            completed(1, 4, [(11, 9), (11, 9), (9, 11), (9, 11), (9, 11)]),
            completed(1, 5, [(11, 9), (11, 9), (9, 11), (9, 11), (9, 11)]),
            completed(2, 4, [(11, 9), (9, 11), (11, 9), (9, 11), (11, 9)]),
            completed(2, 3, [(2, 11), (2, 11), (2, 11)]),
        ]
        ranked = main.standings(list(names), names, matches)
        martin = next(row for row in ranked if row['name'] == 'Martin')
        jane = next(row for row in ranked if row['name'] == 'Jane')
        self.assertEqual((martin['wins'], martin['losses']), (1, 2))
        self.assertEqual((jane['wins'], jane['losses']), (1, 1))
        self.assertGreater(martin['set_difference'], jane['set_difference'])
        self.assertLess(jane['rank'], martin['rank'])

    def test_head_to_head_precedes_sets_for_two_player_record_tie(self):
        names = {1: 'Me', 2: 'Kristian', 3: 'Alex', 4: 'Blair'}
        def completed(a, b, scores):
            wins_a = sum(left > right for left, right in scores)
            match = main.Match(event_id=1, player1_id=a, player2_id=b,
                winner_id=a if wins_a > len(scores) - wins_a else b, status='completed')
            match.sets = [main.SetScore(number=i, player1_points=left, player2_points=right)
                          for i, (left, right) in enumerate(scores, 1)]
            return match
        matches = [
            completed(1, 2, [(11, 9), (11, 9), (9, 11), (9, 11), (9, 11)]),
            completed(1, 3, [(11, 2), (11, 2), (11, 2)]),
            completed(2, 4, [(2, 11), (2, 11), (2, 11)]),
        ]
        ranked = main.standings(list(names), names, matches)
        me = next(row for row in ranked if row['name'] == 'Me')
        kristian = next(row for row in ranked if row['name'] == 'Kristian')
        self.assertEqual((me['wins'], me['losses']), (1, 1))
        self.assertEqual((kristian['wins'], kristian['losses']), (1, 1))
        self.assertGreater(me['set_difference'], kristian['set_difference'])
        self.assertLess(kristian['rank'], me['rank'])

    def test_delete_event_removes_results_and_roster(self):
        coach = self.players[2]
        coach.role = 'coach'
        self.db.commit()
        created = main.create_event(main.EventIn(name='Delete me', best_of=5, event_password='secret12'), self.db, coach)
        event_id = created['id']
        a = main.add_player(event_id, main.AddPlayerIn(name='Guest A'), self.db, coach)
        main.add_player(event_id, main.AddPlayerIn(name='Guest B'), self.db, coach)
        main.generate_schedule(event_id, self.db, coach)
        numeric_id = self.event_row(event_id).id
        fixture = self.db.query(main.Match).filter_by(event_id=numeric_id).one()
        main.save_result(self.db, fixture, main.ResultIn(sets=[(11, 3), (11, 4), (11, 5)]), coach, 'before_submission')
        self.assertEqual(main.delete_event(event_id, self.db, coach), {'ok': True})
        self.assertIsNone(self.db.get(main.Event, numeric_id))
        self.assertEqual(self.db.query(main.Match).filter_by(event_id=numeric_id).count(), 0)
        self.assertIsNone(self.db.get(main.User, a['id']))

    def test_score_validation_and_standings(self):
        with self.assertRaises(main.HTTPException):
            main.validate_result(main.ResultIn(sets=[(11,2),(12,9),(11,5)]),self.match,5)
        result = main.ResultIn(sets=[(11,2),(9,11),(11,5),(12,10)])
        self.assertEqual(main.validate_result(result,self.match,5),self.players[0].id)
        main.save_result(self.db,self.match,result,self.players[0],'before_submission')
        rows = main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])
        self.assertEqual(rows[0]['name'],'Floyd')
        self.assertEqual(rows[0]['points_won'],43)
        self.assertEqual(self.event.status,'complete')
        main.save_result(self.db,self.match,main.ResultIn(sets=[(2,11),(4,11),(5,11)]),self.players[2],'before_correction')
        self.assertEqual(self.match.submitted_by,self.players[0].id)
        self.assertEqual(main.standings([p.id for p in self.players[:2]],{p.id:p.name for p in self.players[:2]},[self.match])[0]['name'],'Sean')
        self.assertGreater(len(self.db.query(main.Audit).all()),2)

    def test_deuce_scores_and_incomplete_matches(self):
        valid = main.ResultIn(sets=[(11, 2), (11, 3), (27, 29), (11, 5)])
        self.assertEqual(main.validate_result(valid, self.match, 5), self.players[0].id)
        for scores in (
            [(11, 89), (11, 3), (11, 5)],
            [(11, 2), (11, 3)],
            [(11, 2), (11, 3), (2, 11), (3, 11)],
        ):
            with self.subTest(scores=scores), self.assertRaises(main.HTTPException):
                main.validate_result(main.ResultIn(sets=scores), self.match, 5)

    def test_startup_bootstraps_first_admin_once(self):
        settings = {
            'BOOTSTRAP_ADMIN_NAME': 'First Coach',
            'BOOTSTRAP_ADMIN_EMAIL': 'first-coach@example.com',
            'BOOTSTRAP_ADMIN_PASSWORD': 'strong-password',
        }
        with patch.dict(os.environ, settings):
            main.initialize()
            main.initialize()
        admins = self.db.query(main.User).filter_by(role='admin').all()
        self.assertEqual(len(admins), 1)
        self.assertEqual(admins[0].email, 'first-coach@example.com')
        self.assertTrue(main.verify_password('strong-password', admins[0].password_hash))

    def test_migration_assigns_uuid_to_existing_events_without_changing_numeric_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            legacy_engine = create_engine('sqlite:///' + directory + '/legacy.db')
            with legacy_engine.begin() as connection:
                connection.execute(text('CREATE TABLE events (id INTEGER PRIMARY KEY, name VARCHAR(120))'))
                connection.execute(text("INSERT INTO events (id, name) VALUES (7, 'Older event'), (42, 'Another event')"))
            with patch.object(main, 'engine', legacy_engine):
                main.migrate_event_public_ids()
                main.migrate_event_public_ids()
            with legacy_engine.connect() as connection:
                rows = connection.execute(text('SELECT id, public_id FROM events ORDER BY id')).all()
                self.assertEqual([row.id for row in rows], [7, 42])
                self.assertEqual(len({row.public_id for row in rows}), 2)
                self.assertTrue(all(str(uuid.UUID(row.public_id)) == row.public_id for row in rows))
                self.assertIn('ix_events_public_id', {index['name'] for index in inspect(connection).get_indexes('events')})
            legacy_engine.dispose()

    def test_deleting_event_keeps_anonymous_scorer_used_elsewhere(self):
        coach = self.players[2]
        coach.role = 'coach'
        player = self.players[0]
        player.password_hash = main.hash_password('old-password')
        self.db.add(main.Participant(event_id=self.event.id, user_id=player.id))
        self.db.commit()
        other = main.create_event(main.EventIn(name='Other', best_of=5, event_password='clubsecret'), self.db, coach)
        main.add_player(other['id'], main.AddPlayerIn(name='Guest One'), self.db, coach)
        main.add_player(other['id'], main.AddPlayerIn(name='Guest Two'), self.db, coach)
        main.generate_schedule(other['id'], self.db, coach)
        fixture = self.db.query(main.Match).filter_by(event_id=self.event_row(other['id']).id).one()
        main.save_result(self.db, fixture, main.ResultIn(sets=[(11, 2), (11, 3), (11, 4)]), player, 'before_submission')
        main.delete_account(main.DeleteAccountIn(password='old-password'), Response(), self.db, player)
        former_id = self.db.query(main.Participant).filter_by(event_id=self.event.id).one().user_id
        self.assertEqual(main.delete_event(self.event.public_id, self.db, coach), {'ok': True})
        self.assertIsNotNone(self.db.get(main.User, former_id))
        self.assertEqual(self.db.query(main.Audit).filter_by(actor_id=former_id).count(), 2)

if __name__ == '__main__': unittest.main()
