export const installFpsMeter = () => {
  const script = document.createElement('script')
  script.onload = () => {
    // @ts-ignore
    const stats = new Stats()
    document.body.appendChild(stats.dom)

    const loop = () => {
      stats.update()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }
  script.src = '//mrdoob.github.io/stats.js/build/stats.min.js'
  document.head.appendChild(script)
}

export default installFpsMeter
