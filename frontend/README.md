# IPFS-AST Webapp

## Usage

### 1) Set CORS access

``` bash
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
```

### Start IPFS

``` bash
ipfs daemon
```

### Start Webapp

``` bash
npm install
npm start -s
```
