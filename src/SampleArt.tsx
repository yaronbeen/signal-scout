const portraits = {
  mayamakes: "/illustrations/maya.svg",
  buildwithalex: "/illustrations/alex.svg",
  jordantechtalk: "/illustrations/jordan.svg",
};

export function samplePortrait(handle: string): string | undefined {
  return portraits[handle as keyof typeof portraits];
}

export function SampleArt() {
  return <figure className="sample-art">
    <div className="creator-vignette" aria-hidden="true">
      {[["mayamakes", "YouTube"], ["buildwithalex", "Instagram"], ["jordantechtalk", "TikTok"]].map(([handle, platform]) => <div className="vignette-tile" key={handle}><img src={samplePortrait(handle)} alt="" /><span>{platform}</span></div>)}
    </div>
    <figcaption>Illustrated sample creators. Also discover on LinkedIn and X.</figcaption>
  </figure>;
}
