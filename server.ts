import express, { Express } from 'express';
import { createSecret, extractAddress, validateSecret } from './web3-login';
import { IncomingMessage, createServer } from 'http';

/**
*
* This Express server exposes endpoints for signing messages and creating JWTs.
* It also has middleware example of how to protect API endpoints.
*/


function getTokenFromRequest(req: IncomingMessage) {
  const cookies = parseCookies(req);
  const token = cookies['authorization'];
  return token;
}

function authenticateTokenForWebsockets(req: IncomingMessage): string | false {
  // Gather the jwt access token from the request header
  const token = getTokenFromRequest(req);
  if (token == null) return false; // if there isn't any token
  const decoded = jwt.verify(token, jwtSecret);
  // @ts-ignore
  return decoded.address;
}

function parseCookies(request: IncomingMessage) {
  const list: {[key: string]: string} = {};
  const cookieHeader = request.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(`;`).forEach(function(cookie) {
      let [ name, ...rest] = cookie.split(`=`);
      name = name?.trim();
      if (!name) return;
      const value = rest.join(`=`).trim();
      if (!value) return;
      list[name] = decodeURIComponent(value);
  });

  return list;
}

function authenticateToken(req: Request, res: Response, next: () => void) {
  // Gather the jwt access token from the request header
  const token = getTokenFromRequest(req);
  if (token == null) return res.sendStatus(401) // if there isn't any token

  jwt.verify(token, jwtSecret, (err, data) => {
    console.log(err)
    if (err) return res.sendStatus(403)
   req.address = data.address;
    next() // pass the execution off to whatever request the client intended
  })
}

const app: Express = express();

app.get(`/login-secret`, async function (req, res){
  const secret = createSecret(appSecret);
  res.send({secret});
});

app.get(`/auth-info`, async function (req, res){
  const address = authenticateTokenForWebsockets(req);
  
  res.send({address });
});

app.get(`/logout`, async function (req, res){
  res.cookie('authorization', "", {
    httpOnly: true,
    secure: false,  // Only send the cookie over HTTPS, set to true for https
    sameSite: false, // Prevent Cross-Site Request Forgery
    maxAge: 0 // Cookie's expiration time in milliseconds (30 days)
  });

  res.send({});
});

// verifies that the user signed one of our secrets in the last 5 minutes
// extracts the user's public address
// verifies that the user has a balance of tokens
// sends back a jwt
app.post(`/verify-login`, async function (req, res){
  try {
      const originalMessage = req.body.originalMessage;
      if (!originalMessage) {
          res.send({error: "originalMessage required"})
          return;
      }

      const signedMessage = req.body.signedMessage;
      if (!signedMessage) {
          res.send({error: "signedMessage required"})
          return;
      }

      const validSecret = validateSecret(originalMessage, appSecret, 5*60*1000); // 5 minutes in millis
      if (!validSecret) {
          res.send({error: "bad secret"})
          return;
      }

      const address = extractAddress(originalMessage, signedMessage);
      // console.log('address that we think the user signed with', address);

      const token = jwt.sign({ address }, jwtSecret, { expiresIn: '30d' });
      console.log('cookie', token);

      // TODO: set expiry to when the payment expires. otherwise, set 30days.
      res.cookie('authorization', token, {
        httpOnly: true,
        secure: usingSsl,  // Only send the cookie over HTTPS, set to true for https
        sameSite: usingSsl ? 'strict' : false, // Prevent Cross-Site Request Forgery
        maxAge: 2592000000 // Cookie's expiration time in milliseconds (30 days)
      });
    
      res.json({ token });
  } catch (e: unknown) {
      res.send({error: (e as Error).message})
      console.error('verifyLogin', e)
  }
});

// example of how to use authenticateToken as middleware
app.get('/', authenticateToken, (req: Request, res: Response) => {
  res.send('Hello from the REST API!');
});

app.listen(port, () => {
  console.log(`REST API Server running at http://localhost:${port}`);
});

/**
* Websockets authorization example. The REST API is needed to sign messages and log in/out, but websockets can authenticate a user before replying as well.
*/

function onSocketError(err: unknown) {
  console.error(err);
}

wss.on('connection', function connection(ws) {
  console.log('Client connected to WebSocket');
  ws.on('error', console.error);

  // @ts-ignore
  // console.log('Client connected to WebSocket', ws.id);

  // console.log(ws);
  ws.on('message', (message: string) => {
    console.log(`Received message: ${message}`);
    ws.send(`Server received: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');

  });
});

server.on('upgrade', async function upgrade(request, socket, head) {
  socket.on('error', onSocketError);

  const address = await authenticateTokenForWebsockets(request);

  socket.removeListener('error', onSocketError);

  wss.handleUpgrade(request, socket, head, function done(ws) {
    // @ts-ignore
    ws.id = uuidv4();
    // @ts-ignore
    if (address) {
      // @ts-ignore
      // USER IS LOGGED IN HERE
    } else {
      // @ts-ignore
      // USER IS NOT LOGGED IN HERE, RESPOND WITH 401 or something.
    }
    wss.emit('connection', ws);
  });

});

const wsPort = 8080;
server.listen(wsPort, () => {
  console.log(`WebSocket server listening on wsPort ${wsPort}`);
});
