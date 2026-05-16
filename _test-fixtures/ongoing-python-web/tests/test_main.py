"""ai-orchestra fixture: pytest smoke test stub. Not executed."""

import pytest


@pytest.mark.asyncio
async def test_read_item_returns_placeholder() -> None:
    from app.main import create_app

    app = create_app()
    assert app.title == "fixture-ongoing-python-web"
