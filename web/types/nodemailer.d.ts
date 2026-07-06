declare module 'nodemailer' {
  interface Transport {
    sendMail(opts: { from?: string; to: string; subject: string; html?: string; text?: string }): Promise<any>
  }
  interface Options {
    host?: string; port?: number; secure?: boolean
    auth?: { user?: string; pass?: string }
  }
  const nodemailer: { createTransport(opts: Options): Transport }
  export default nodemailer
}
