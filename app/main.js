const net = require("net");
const fs = require("fs");
const zlib = require("zlib");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestData = data.toString();
    const path = requestData.split(" ")[1];
    const headers = requestData.split("\r\n");

    let resStat = "200 OK";
    let responseHeaders = [];
    let responseBody = "";
    let contentEncoding;

    console.log(`Request Data: ${requestData}`);
    console.log(`Path: ${path}`);
    console.log(`Headers: ${headers}`);

    //accept encoding
    if (requestData.includes("Accept-Encoding")) {
      //find encoding

      for (let i = 0; i < headers.length; i++) {
        if (headers[i].includes("Accept-Encoding:")) {
          contentEncoding = headers[i].split("Accept-Encoding: ")[1];
        }
      }
      // responseHeaders.push(`Content-Type: text/plain`);
    }

    if (requestData.startsWith("GET")) {
      if (path === "/") {
        responseBody = "Welcome to the home page!";
      } else if (path.startsWith("/echo/")) {
        responseHeaders.push(`Content-Type: text/plain`);
        responseBody = path.slice(6);
      } else if (path.startsWith("/user-agent")) {
        let userAgent;

        for (let i = 0; i < headers.length; i++) {
          if (headers[i].includes("User-Agent: ")) {
            userAgent = headers[i].split("User-Agent: ")[1];
          }
        }
        if (userAgent === undefined) {
          resStat = "404 No User Agent Found";
        } else {
          responseHeaders.push(`Content-Type: text/plain`);
          responseBody = userAgent;
        }
      } else if (path.includes(`/files/`)) {
        const fileName = path.split(`/files/`)[1];
        const directory = process.argv[3];
        console.log(`Directory: ${directory}`);
        console.log(`Files: ${fileName}`);
        if (fs.existsSync(`${directory}/${fileName}`)) {
          responseBody = fs.readFileSync(`${directory}/${fileName}`).toString();
          responseHeaders.push(`Content-Type: application/octet-stream`);
        } else {
          resStat = "404 Not Found";
          responseBody = "File not found.";
        }
      } else {
        resStat = "404 Not Found";
        responseBody = "Not found.";
      }
    } else if (requestData.startsWith("POST")) {
      const fileName = path.split(`/files/`)[1];
      const directory = process.argv[3];
      console.log(`Directory: ${directory}`);
      console.log(`Files: ${fileName}`);
      if (directory && fileName) {
        fileContent = headers[headers.length - 1];
        console.log(`Content: ${fileContent}`);
        resStat = "201 Created";
        fs.writeFileSync(`${directory}/${fileName}`, fileContent);
        responseHeaders.push(`Content-Type: application/octet-stream`);
        responseBody = `${fileContent}`;
      } else {
        resStat = "404 Not Found";
        responseBody = "File not created.";
      }
    } else {
      resStat = "400 Bad Request";
      responseBody = "Unsupported request method.";
    }

    socket.on("error", (err) => {
      if (err.code === "ECONNRESET") {
        console.log("Client connection was reset");
      } else {
        console.error("Socket error:", err);
      }
    });

    const shouldGzip = contentEncoding.includes("gzip");

    if (shouldGzip) {
      responseHeaders.push(`Content-Encoding: gzip`);
      zlib.gzip(responseBody, (err, result) => {
        if (err) {
          console.error("gzip compression err", err);
          socket.end();
          return;
        }
        responseHeaders.push(`Content-Length: ${result.length}`);
        const finalResponseHeaders = `HTTP/1.1 ${resStat}\r\n${responseHeaders.join(
          "\r\n"
        )}\r\n\r\n`;
        console.log(`Sending response with Gzip: ${finalResponseHeaders}`);
        console.log(responseBody)
        socket.write(finalResponseHeaders);
        socket.write(responseBody);
      });
    } else {
      responseHeaders.push(
        `Content-Length: ${Buffer.byteLength(responseBody)}`
      );
      const finalResponse = `HTTP/1.1 ${resStat}\r\n${responseHeaders.join(
        "\r\n"
      )}\r\n\r\n${responseBody}`;
      console.log(`Sending response: ${finalResponse}`);
      socket.write(finalResponse);
    }
  });

  socket.on("close", () => {
    console.log("Connection closed");
    socket.end();
  });
});

server.listen(4221, "localhost");
