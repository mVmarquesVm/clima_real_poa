import { useCallback, useState } from 'react'

// "Perto de mim": pede a localização ao navegador SÓ no clique (o navegador
// pergunta antes à pessoa). A posição fica só na memória desta página: não vai
// para a nossa API nem para lugar nenhum (a rota a pé avisa antes de enviar).
//
// estado: 'parado' | 'buscando' | 'ok' | 'erro'
export default function useLocalizacao() {
  const [estado, setEstado] = useState('parado')
  const [posicao, setPosicao] = useState(null)
  const [erro, setErro] = useState(null)

  const pedir = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('erro')
      setErro('Este navegador não informa a localização.')
      return
    }
    setEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosicao({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy })
        setErro(null)
        setEstado('ok')
      },
      (e) => {
        // Sem posição nova, a velha sai: a lista não fica ordenada por um lugar antigo.
        setPosicao(null)
        setEstado('erro')
        // Os 3 códigos da API de geolocalização, em português simples. Todos
        // apontam a saída (o CEP, logo abaixo): ninguém fica sem caminho.
        setErro(
          e.code === e.PERMISSION_DENIED
            ? 'O celular não deixou ver onde você está. Tudo bem: digite o CEP de onde você sai, logo abaixo.'
            : e.code === e.TIMEOUT
              ? 'Demorou demais para achar onde você está. Tente de novo ou digite o CEP, logo abaixo.'
              : 'Não deu para achar onde você está. Digite o CEP de onde você sai, logo abaixo.',
        )
      },
      // Precisão de cidade basta (sem GPS fino, gasta menos bateria); posição de até 5 min vale.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  // Plano B: a partida vem do CEP (BotaoPertoDeMim). "onde" é o endereço em
  // texto, para a tela dizer de onde as distâncias são contadas.
  const usarEndereco = useCallback((ponto, onde) => {
    setPosicao({ lat: ponto.lat, lon: ponto.lon, onde })
    setErro(null)
    setEstado('ok')
  }, [])

  const esquecer = useCallback(() => {
    setPosicao(null)
    setErro(null)
    setEstado('parado')
  }, [])

  return { estado, posicao, erro, pedir, usarEndereco, esquecer }
}
