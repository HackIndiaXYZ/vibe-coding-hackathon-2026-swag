const BAR_COUNT = 24

function WaveformVisualizer({ isActive = false }) {
  return (
    <div
      className="flex h-16 items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          className={[
            'w-[3px] rounded-full bg-mirror-accent/80',
            isActive ? 'waveform-bar' : 'h-2 opacity-30',
          ].join(' ')}
          style={
            isActive
              ? {
                  animationDelay: `${index * 0.05}s`,
                  '--bar-scale': `${0.4 + (index % 5) * 0.15}`,
                }
              : undefined
          }
        />
      ))}
    </div>
  )
}

export default WaveformVisualizer
