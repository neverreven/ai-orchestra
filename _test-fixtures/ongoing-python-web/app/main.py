"""ai-orchestra fixture: minimal FastAPI app entrypoint.

This file is NOT executed. It exists to provide the `from fastapi import FastAPI`
signal so the discovery probe can confirm the FastAPI framework.
"""

from fastapi import FastAPI

from app.models import Item


def create_app() -> FastAPI:
    app = FastAPI(title="fixture-ongoing-python-web")

    @app.get("/items/{item_id}", response_model=Item)
    async def read_item(item_id: int) -> Item:
        return Item(id=item_id, name="placeholder")

    return app


app = create_app()
