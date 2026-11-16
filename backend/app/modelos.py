"""Modelos de validação (Pydantic): o "porteiro" dos dados.

Tudo o que chega pela API passa por aqui antes de tocar no banco. Se um campo
estiver errado, o FastAPI devolve 422 com a lista dos erros (traduzidos em
app/erros.py), e nada é gravado.

Python puro com anotações: `nome: str` vira uma regra ("nome tem que ser texto"),
e o Field(...) acrescenta os limites (tamanho, mínimo e máximo).
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.banco import ATIVIDADES, TIPOS_DE_LOCAL

# Caixa que contém o município de Porto Alegre (com uma pequena folga).
# Um ponto fora dela é erro de digitação: troca de lat/lon, sinal esquecido...
LAT_MIN, LAT_MAX = -30.27, -29.93
LON_MIN, LON_MAX = -51.31, -51.01

TipoDeLocal = Literal[TIPOS_DE_LOCAL]
Atividade = Literal[ATIVIDADES]


class LocalEntrada(BaseModel):
    """O que o cliente manda para criar (POST) ou substituir (PUT) um local."""

    # Tira os espaços do começo e do fim de todo texto: "  Praça  " vira "Praça".
    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=3, max_length=80, examples=["Praça da Matriz"])
    tipo: TipoDeLocal
    lat: float = Field(ge=LAT_MIN, le=LAT_MAX, examples=[-30.0331])
    lon: float = Field(ge=LON_MIN, le=LON_MAX, examples=[-51.2300])
    tem_sombra: bool
    tem_bebedouro: bool
    atividades: list[Atividade] = Field(min_length=1, examples=[["caminhada", "crianca"]])
    observacao: str | None = Field(default=None, max_length=200)

    @field_validator("atividades")
    @classmethod
    def sem_repetidas(cls, atividades: list[str]) -> list[str]:
        """["pedal", "pedal"] vira ["pedal"], mantendo a ordem."""
        return list(dict.fromkeys(atividades))

    @field_validator("observacao")
    @classmethod
    def vazia_vira_nada(cls, observacao: str | None) -> str | None:
        """Um campo de texto apagado no formulário chega como "": guardamos None."""
        return observacao or None


class Local(LocalEntrada):
    """O que a API devolve: os mesmos campos, mais o id criado pelo banco."""

    id: int
