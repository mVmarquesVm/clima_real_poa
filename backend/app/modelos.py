"""Modelos de validação (Pydantic): o "porteiro" dos dados.

Tudo o que chega pela API passa por aqui antes de tocar no banco. Se um campo
estiver errado, o FastAPI devolve 422 com a lista dos erros (traduzidos em
app/erros.py), e nada é gravado.

Python puro com anotações: `nome: str` vira uma regra ("nome tem que ser texto"),
e o Field(...) acrescenta os limites (tamanho, mínimo e máximo).
"""

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from app.banco import ATIVIDADES, TIPOS_DE_HIDRATACAO, TIPOS_DE_LOCAL

# Caixa que contém o município de Porto Alegre (com uma pequena folga).
# Um ponto fora dela é erro de digitação: troca de lat/lon, sinal esquecido...
LAT_MIN, LAT_MAX = -30.27, -29.93
LON_MIN, LON_MAX = -51.31, -51.01

TipoDeLocal = Literal[TIPOS_DE_LOCAL]
TipoDeHidratacao = Literal[TIPOS_DE_HIDRATACAO]
Atividade = Literal[ATIVIDADES]

# "HH:MM" de 00:00 a 23:59. É texto, e não um horário do Python, porque o
# formulário e o banco guardam assim; e "09:00" < "18:00" vale como texto também.
HORARIO = r"^([01]\d|2[0-3]):[0-5]\d$"

# Regras de todos os modelos:
# - str_strip_whitespace: tira os espaços das pontas ("  Praça  " vira "Praça");
# - strict: cada campo tem de vir no tipo certo. Sem isso, o Pydantic "dá um
#   jeito": "true" e "yes" viram verdadeiro, "-30.03" (texto) vira número e
#   true vira 1.0 na latitude. O front manda os tipos certos; quem não manda
#   recebe um 422 claro, em vez de um dado convertido sem ninguém saber.
REGRAS = ConfigDict(str_strip_whitespace=True, strict=True)

NOME_MINIMO = 3


def sem_controle(texto: str) -> str:
    """Recusa caracteres de controle (ex.: o byte nulo \\x00), que não aparecem na tela."""
    if any(unicodedata.category(c) == "Cc" for c in texto):
        raise ValueError("Tem caracteres invisíveis de controle, que não são permitidos.")
    return texto


def nome_visivel(nome: str) -> str:
    """Conta só o que aparece na tela: 3 espaços de largura zero não são um nome."""
    sem_controle(nome)
    visiveis = sum(
        1 for c in nome if not c.isspace() and unicodedata.category(c) not in ("Cf", "Cc")
    )
    if visiveis < NOME_MINIMO:
        raise ValueError(f"Use pelo menos {NOME_MINIMO} letras ou números visíveis.")
    return nome


class LocalEntrada(BaseModel):
    """O que o cliente manda para criar (POST) ou substituir (PUT) um local."""

    model_config = REGRAS

    nome: str = Field(min_length=NOME_MINIMO, max_length=80, examples=["Praça da Matriz"])
    tipo: TipoDeLocal
    lat: float = Field(ge=LAT_MIN, le=LAT_MAX, examples=[-30.0331])
    lon: float = Field(ge=LON_MIN, le=LON_MAX, examples=[-51.2300])
    tem_sombra: bool
    tem_bebedouro: bool
    atividades: list[Atividade] = Field(min_length=1, examples=[["caminhada", "crianca"]])
    observacao: str | None = Field(default=None, max_length=200)

    @field_validator("nome")
    @classmethod
    def checar_nome(cls, nome: str) -> str:
        return nome_visivel(nome)

    @field_validator("atividades")
    @classmethod
    def sem_repetidas(cls, atividades: list[str]) -> list[str]:
        """["pedal", "pedal"] vira ["pedal"], mantendo a ordem."""
        return list(dict.fromkeys(atividades))

    @field_validator("observacao")
    @classmethod
    def vazia_vira_nada(cls, observacao: str | None) -> str | None:
        """Um campo de texto apagado no formulário chega como "": guardamos None."""
        return sem_controle(observacao) if observacao else None


class Local(LocalEntrada):
    """O que a API devolve: os mesmos campos, mais o id criado pelo banco."""

    id: int


class HidratacaoEntrada(BaseModel):
    """O que o cliente manda para criar (POST) ou substituir (PUT) um ponto de hidratação."""

    model_config = REGRAS

    nome: str = Field(min_length=NOME_MINIMO, max_length=80, examples=["Bebedouro do Chafariz"])
    tipo: TipoDeHidratacao
    lat: float = Field(ge=LAT_MIN, le=LAT_MAX, examples=[-30.0331])
    lon: float = Field(ge=LON_MIN, le=LON_MAX, examples=[-51.2300])
    # Os dois vazios = aberto 24 h. O validate_default faz a regra de "fecha"
    # rodar mesmo quando ele não vem, para pegar "abre sem fecha".
    abre: str | None = Field(default=None, pattern=HORARIO, examples=["09:00"])
    fecha: str | None = Field(default=None, pattern=HORARIO, validate_default=True, examples=["18:00"])
    abre_domingo: bool
    ativo: bool = True

    @field_validator("nome")
    @classmethod
    def checar_nome(cls, nome: str) -> str:
        return nome_visivel(nome)

    @field_validator("abre", "fecha", mode="before")
    @classmethod
    def horario_vazio_vira_nada(cls, horario):
        """O campo de horário apagado no formulário chega como "": vira None (24 h)."""
        if isinstance(horario, str) and not horario.strip():
            return None
        return horario

    @field_validator("fecha")
    @classmethod
    def horarios_combinam(cls, fecha: str | None, info: ValidationInfo) -> str | None:
        """Os dois horários juntos (ou nenhum), e o de fechar depois do de abrir.

        Os campos são validados na ordem em que aparecem: quando chega a vez de
        "fecha", o "abre" já está em info.data (se ele próprio era válido).
        """
        if "abre" not in info.data:  # o "abre" já deu erro: não repete a bronca
            return fecha
        abre = info.data["abre"]
        if (abre is None) != (fecha is None):
            raise ValueError("Preencha os dois horários, ou deixe os dois vazios (aberto 24 h).")
        if abre is not None and fecha <= abre:
            raise ValueError("O horário de fechar tem de ser depois do de abrir.")
        return fecha


class Hidratacao(HidratacaoEntrada):
    """O que a API devolve: os mesmos campos, mais o id criado pelo banco."""

    id: int
