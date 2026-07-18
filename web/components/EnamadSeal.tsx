// eNamad (Iranian e-commerce trust seal). Must be displayed on the live site;
// eNamad periodically checks its presence. Clicking opens the verification page.
export function EnamadSeal({ size = 90 }: { size?: number }) {
  return (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noopener"
      href="https://trustseal.enamad.ir/?id=6947405&Code=OzeVG18JceRHKV4FvtvtYyIiDXfiuxRU"
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        referrerPolicy="origin"
        src="https://trustseal.enamad.ir/logo.aspx?id=6947405&Code=OzeVG18JceRHKV4FvtvtYyIiDXfiuxRU"
        alt="نماد اعتماد الکترونیکی"
        {...{ code: 'OzeVG18JceRHKV4FvtvtYyIiDXfiuxRU' } as any}
        style={{ cursor: 'pointer', width: size, height: 'auto', borderRadius: 8 }}
      />
    </a>
  )
}
