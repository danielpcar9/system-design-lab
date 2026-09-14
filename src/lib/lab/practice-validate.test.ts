import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exerciseById, nextRecommended } from "./curriculum.ts";
import {
  allPassed,
  failedIds,
  frequentErrorIds,
  hiddenResults,
  runExerciseTests,
  visibleResults,
} from "./practice-validate.ts";

describe("practice validation", () => {
  it("rejects the FastAPI starter stub", () => {
    const exercise = exerciseById("shortener-create");
    assert.ok(exercise);
    const results = runExerciseTests(exercise, exercise.starters.fastapi, "fastapi");
    assert.equal(allPassed(results), false);
    assert.ok(failedIds(results).length > 0);
  });

  it("accepts a complete FastAPI sketch", () => {
    const exercise = exerciseById("shortener-create");
    assert.ok(exercise);
    const code = `
@router.post("/links", status_code=201)
def create_link(payload: LinkIn):
    parsed = urlparse(payload.url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(422)
    try:
        db.execute("INSERT INTO links ...")
        db.commit()
    except UniqueViolation:
        raise HTTPException(409, "conflict")
`;
    const results = runExerciseTests(exercise, code, "fastapi");
    assert.equal(allPassed(results), true);
  });

  it("keeps hidden tests out of the visible list", () => {
    const exercise = exerciseById("shortener-create");
    assert.ok(exercise);
    assert.ok(exercise.tests.some((test) => !test.visible));
    const results = runExerciseTests(exercise, exercise.starters.fastapi, "fastapi");
    assert.equal(hiddenResults(results).length > 0, true);
    assert.equal(
      visibleResults(results).every((item) => item.visible),
      true,
    );
  });

  it("recommends an in-progress exercise before a new one", () => {
    const next = nextRecommended("url-shortener", (id) =>
      id === "shortener-create" ? "in-progress" : "not-started",
    );
    assert.equal(next?.id, "shortener-create");
  });

  it("ranks frequent misses by count", () => {
    assert.deepEqual(frequentErrorIds([["failure", "cache"], ["failure"], ["job"]]), [
      "failure",
      "cache",
      "job",
    ]);
  });
});
