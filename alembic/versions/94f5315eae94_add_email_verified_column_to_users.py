"""add email_verified column to users

Revision ID: 94f5315eae94
Revises:
Create Date: 2026-03-04 15:38:20.293796

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '94f5315eae94'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email_verified column to users table."""
    op.add_column(
        'users',
        sa.Column(
            'email_verified',
            sa.Boolean(),
            server_default='false',
            nullable=False,
            comment='Whether the user has verified their email address',
        ),
    )


def downgrade() -> None:
    """Remove email_verified column from users table."""
    op.drop_column('users', 'email_verified')
