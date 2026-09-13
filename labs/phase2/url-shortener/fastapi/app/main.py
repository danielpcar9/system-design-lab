from dataclasses import dataclass
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator


class LinkIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str = Field(min_length=1, max_length=2_048)

    @field_validator("url")
    @classmethod
    def must_be_http_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("url must be an absolute HTTP(S) URL")
        return value


class LinkOut(BaseModel):
    code: str
    url: str


@dataclass
class Link:
    code: str
    url: str


app = FastAPI(title="URL Shortener Phase 2 Lab")
links_by_code: dict[str, Link] = {}


@app.post("/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(payload: LinkIn) -> Link:
    # Exercise: replace this deterministic code with an injected generator.
    code = "abc123"
    if code in links_by_code:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="code already exists")
    link = Link(code=code, url=payload.url)
    links_by_code[code] = link
    return link


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
