import copy
import json
from pathlib import Path

import jsonschema
import pytest
from pydantic import ValidationError

from algoverse_trace_schema.v1 import Trace

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = json.loads((ROOT / "schema/v1/trace.schema.json").read_text(encoding="utf-8"))
FIXTURE = json.loads(
    (ROOT / "fixtures/bubble-sort-5-1-4.trace.json").read_text(encoding="utf-8")
)


def test_fixture_validates_against_json_schema() -> None:
    jsonschema.Draft202012Validator(SCHEMA).validate(FIXTURE)


def test_fixture_parses_into_pydantic() -> None:
    trace = Trace.model_validate(FIXTURE)
    event = trace.events[3]
    event = getattr(event, "root", event)  # generator may wrap the union in a RootModel
    assert event.kind == "compare" and event.result is True


def test_unknown_event_kind_rejected() -> None:
    bad = copy.deepcopy(FIXTURE)
    bad["events"][0] = {"seq": 0, "kind": "teleport", "depth": 0}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.Draft202012Validator(SCHEMA).validate(bad)
    with pytest.raises(ValidationError):
        Trace.model_validate(bad)
