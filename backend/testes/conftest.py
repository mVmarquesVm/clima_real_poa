"""Cada teste usa um banco novo numa pasta temporária: o forno_alegre.db real
nunca é tocado pelos testes."""

import pytest


@pytest.fixture(autouse=True)
def banco_temporario(tmp_path, monkeypatch):
    monkeypatch.setenv("FORNO_BANCO", str(tmp_path / "teste.db"))
