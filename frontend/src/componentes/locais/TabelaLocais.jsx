import { data, descreverVerde, numero } from '../../lib/formato'

// Tabela dos locais monitorados, pelo ranking do satélite.
// É a versão ACESSÍVEL do mapa: o mapa é um desenho (canvas) que o leitor de
// tela não enxerga, então tudo o que ele mostra também está aqui, em texto.
export default function TabelaLocais({ locais, passagens }) {
  return (
    // A região rolável recebe foco (tabIndex) para quem usa teclado conseguir
    // rolar a tabela no celular, onde ela pode ficar mais larga que a tela.
    <div
      role="region"
      aria-labelledby="legenda-locais"
      tabIndex={0}
      className="overflow-x-auto rounded border border-borda bg-superficie focus-visible:outline-2 focus-visible:outline-foco"
    >
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption id="legenda-locais" className="p-3 text-left">
          <span className="block font-semibold">Ranking do calor do piso nos locais monitorados</span>
          <span className="block text-texto-suave">
            Temperatura da <strong>superfície</strong> (piso) medida pelo satélite Landsat por volta das
            10h20, em {passagens.total} dias de verão sem nuvens, de {data(passagens.primeira)} a{' '}
            {data(passagens.ultima)}. Não é a temperatura do ar nem a sensação térmica.
          </span>
        </caption>
        <thead className="bg-superficie-2">
          <tr>
            <th scope="col" className="p-3">Posição</th>
            <th scope="col" className="p-3">Local</th>
            <th scope="col" className="p-3">Tipo</th>
            <th scope="col" className="p-3 text-right">Piso no verão (média)</th>
            <th scope="col" className="p-3 text-right">Piso mais quente</th>
            <th scope="col" className="p-3 text-right">Piso acima do ar*</th>
            <th scope="col" className="p-3">Vegetação (NDVI)</th>
          </tr>
        </thead>
        <tbody>
          {locais.map((local) => {
            const s = local.satelite
            return (
              <tr key={local.id} className="border-t border-borda">
                <td className="p-3">{s.posicao}º</td>
                {/* O nome é o cabeçalho da linha: o leitor de tela anuncia
                    "Parque Harmonia, Piso no verão, 41,7 °C". */}
                <th scope="row" className="p-3 font-semibold">{local.nome}</th>
                <td className="p-3">{local.tipo}</td>
                <td className="p-3 text-right">{numero(s.pisoMedioVerao)} °C</td>
                <td className="p-3 text-right">{numero(s.pisoMaximo)} °C</td>
                <td className="p-3 text-right">+{numero(s.acimaDoAr)} °C</td>
                <td className="p-3">
                  {numero(s.ndvi, 2)} ({descreverVerde(s.ndvi)})
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-borda p-3 text-xs text-texto-suave">
        * Diferença média entre o piso e o ar medido pela estação oficial do INMET (A801) na mesma hora,
        nas passagens de 2025. Fonte: Landsat 8/9 e Sentinel-2, via Microsoft Planetary Computer;
        áreas do OpenStreetMap.
      </p>
    </div>
  )
}
