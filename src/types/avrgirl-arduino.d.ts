declare module 'avrgirl-arduino' {
  interface AvrgirlOptions {
    board: string
    port: string
    debug?: boolean
  }

  class Avrgirl {
    constructor(options: AvrgirlOptions)
    flash(hexPath: string, callback: (error: Error | null) => void): void
    list(callback: (error: Error | null, ports: string[]) => void): void
  }

  export default Avrgirl
}
