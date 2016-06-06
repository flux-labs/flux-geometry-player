var config = {
  url: 'http://localhost:8000', // your url
  fluxUrl: 'https://flux.io', // flux url
  port: 8000, // your app port
  portSSL: 8433, // your app secure port
  flux: '', // your flux key
}
if (typeof module !== 'undefined' && this.module !== module) module.exports = config;
else window.config = config;
