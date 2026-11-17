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
        // Os 3 códigos da API de geolocalização, em português.
        setErro(
          e.code === e.PERMISSION_DENIED
            ? 'Você não permitiu o acesso à localização. Dá para liberar no cadeado da barra de endereço.'
            : e.code === e.TIMEOUT
              ? 'A localização demorou demais. Tente de novo.'
              : 'Não foi possível descobrir onde você está.',
        )
      },
      // Precisão de cidade basta (sem GPS fino, gasta menos bateria); posição de até 5 min vale.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  const esquecer = useCallback(() => {
    setPosicao(null)
    setErro(null)
    setEstado('parado')
  }, [])

  return { estado, posicao, erro, pedir, esquecer }
}
