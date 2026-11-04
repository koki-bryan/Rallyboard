"""Create the configured local PostgreSQL database and application tables."""

from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
import psycopg
from psycopg import sql

from main import Base, DATABASE_URL, engine


def main() -> None:
    url = make_url(DATABASE_URL)
    if url.get_backend_name() != 'postgresql' or not url.database:
        raise SystemExit('DATABASE_URL must name a PostgreSQL database')
    try:
        with psycopg.connect(url.set(drivername='postgresql', database='postgres').render_as_string(hide_password=False), autocommit=True) as connection:
            exists = connection.execute('SELECT 1 FROM pg_database WHERE datname = %s', (url.database,)).fetchone()
            if not exists:
                connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(url.database)))
                print(f'Created database {url.database}')
            else:
                print(f'Database {url.database} already exists')
        Base.metadata.create_all(engine)
        print('Application tables are ready')
    except (OperationalError, psycopg.OperationalError) as exc:
        raise SystemExit('Could not connect to local PostgreSQL. Check that it is running and that backend/.env has the correct credentials.') from exc


if __name__ == '__main__':
    main()
