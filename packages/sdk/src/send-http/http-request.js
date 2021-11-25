import {invariant} from "@onflow/util-invariant"

class HTTPRequestError extends Ersror {
  constructor({error, hostname, path, port, method, body}) {
    const msg = `
      HTTP Request Error: An error occurred when interacting with the Access API.
      error=${error}
      hostname=${hostname}
      path=${path}
      port=${port}
      method=${method}
      body=${body}
    `
    super(msg)
    this.name = "HTTP Request Error"
  }
}

/**
 * Creates an HTTP Request to an Access API.
 * 
 * Supports the Fetch API on Web Browsers and Deno.
 * Uses the Node HTTP standard library for Node.
 * 
 * @param {String} hostname - Access API Hostname
 * @param {Number} [port = 443] - Port of the Access API
 * @param {String} path - Path to the resource on the Access API
 * @param {String} method - HTTP Method
 * @param {Object} body - HTTP Request Body
 * 
 * @returns Parsed JSON object response from Access API. 
 */
export async function httpRequest({
  hostname,
  port = 443,
  path,
  method,
  body,
}) {
  const fetchTransport = fetch || window?.fetch
  const nodeHttpsTransport = await import("https").catch(e => undefined)

  invariant((fetchTransport || nodeHttpsTransport), "HTTP Request error: Could not find a supported http module.")

  if (fetchTransport) {

    return await fetchTransport(
      hostname + path,
      {
        method: method,
        body: JSON.stringify(body),
      }
    ).then(res => res.json())

  } else if (nodeHttpsTransport) {

    return new Promise((resolve, reject) => {

      const options = {
        hostname,
        port,
        path,
        method,
        headers: body ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        } : undefined
      }

      const req = nodeHttpsTransport.request(options, (res) => {
        var body = []
        
        res.on("data", body.push)

        res.on("end", () => {
          try {
            body = JSON.parse(Buffer.concat(body).toString());
          } catch(e) {
              reject(e);
          }
          resolve(body);
        })
      })

      req.on("error", error => {


        reject(error)
      })
      
      if (body) req.write(JSON.stringify(body))
      req.end()

    })
  }
}