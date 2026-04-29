"""ai-orchestra fixture: minimal Pydantic model. Not executed."""

from pydantic import BaseModel


class Item(BaseModel):
    id: int
    name: str
