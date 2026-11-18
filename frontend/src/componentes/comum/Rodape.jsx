// Rodapé com "Sobre os dados": tudo o que é técnico (de onde vêm os números,
// quais serviços o app usa) fica aqui, numa gaveta fechada. Assim o caminho de
// quem só quer passear fica limpo, e quem quer conferir acha tudo num lugar só.
const FONTES = [
  [
    'Estações',
    'ESP32 simulados no Wokwi, com os valores ajustados à mão (demonstração, não medição). Dados nos canais públicos 3578427, 3584100, 3584102 e 3584103 do ThingSpeak.',
  ],
  ['Sensação térmica', 'Temperatura Aparente de Steadman, com temperatura, umidade, vento e sol.'],
  [
    'Cores do risco',
    'Nota Técnica nº 01/26 da Secretaria Municipal de Saúde de Porto Alegre (abaixo de 27 °C verde; 27 a 33 amarelo; 34 a 39 laranja; 40 a 51 vermelho; 52 ou mais roxo).',
  ],
  [
    'Previsão',
    'Open-Meteo. É um modelo em grade, igual para os 4 locais do Centro; vale a sensação ao sol, que é o pior caso.',
  ],
  ['Ordem dos locais', 'Primeiro os com sombra, depois o mais perto de você e, por fim, os com bebedouro.'],
  [
    'Rotas e endereços',
    'Rotas a pé: serviço da FOSSGIS, sobre o OpenStreetMap. CEP: ViaCEP. Endereço no mapa: Nominatim (OpenStreetMap). Mapa: OpenFreeMap, com dados do OpenStreetMap.',
  ],
  [
    'Satélite',
    'Landsat 8/9 (temperatura do piso) e Sentinel-2 (vegetação), pelo Microsoft Planetary Computer; cobertura do solo do ESA WorldCover 2021; áreas do OpenStreetMap.',
  ],
]

export default function Rodape() {
  return (
    <footer className="mx-auto max-w-6xl border-t border-borda p-4">
      <details>
        <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
          Sobre os dados e as fontes
        </summary>
        <dl className="mt-3 space-y-2">
          {FONTES.map(([titulo, texto]) => (
            <div key={titulo}>
              <dt className="font-semibold">{titulo}</dt>
              <dd>{texto}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="mt-3 text-texto-suave">Clima Real POA · projeto acadêmico (FIAP, 2026).</p>
    </footer>
  )
}
