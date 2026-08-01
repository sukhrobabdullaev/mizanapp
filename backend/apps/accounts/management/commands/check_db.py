"""Verify that the configured Postgres database is reachable."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError, connection


class Command(BaseCommand):
    help = "Check connectivity to the database configured via DATABASE_URL."

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version(), current_database(), current_user")
                row = cursor.fetchone()
        except DatabaseError as exc:
            raise CommandError(f"Database connection failed: {exc}") from exc

        if row is None:  # pragma: no cover - defensive
            raise CommandError("Database returned no rows for the version probe.")

        version, database, user = row
        params = connection.get_connection_params()
        self.stdout.write(self.style.SUCCESS("Database connection OK"))
        self.stdout.write(f"  host:     {params.get('host')}:{params.get('port')}")
        self.stdout.write(f"  database: {database}")
        self.stdout.write(f"  user:     {user}")
        self.stdout.write(f"  server:   {version.split(' on ')[0]}")
