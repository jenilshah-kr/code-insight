#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn, exec } = require('child_process')
const net  = require('net')
const os   = require('os')
const path = require('path')
const fs   = require('fs')

const PKG_DIR   = path.join(__dirname, '..')
const CACHE_DIR = path.join(os.homedir(), '.code-insight')

// ANSI helpers — Kroger Blue palette
const B1  = '\x1b[38;5;27m'   // Kroger Blue
const B2  = '\x1b[38;5;33m'   // Lighter blue
const DIM = '\x1b[2m'
const B   = '\x1b[1m'
const R   = '\x1b[0m'

function printBanner() {
  const art = [
    `${B1}${B} ██████╗ ██████╗ ██████╗ ███████╗    ██╗███╗   ██╗███████╗██╗ ██████╗ ██╗  ██╗████████╗${R}`,
    `${B1}${B}██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██║████╗  ██║██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝${R}`,
    `${B2}${B}██║     ██║   ██║██║  ██║█████╗      ██║██╔██╗ ██║███████╗██║██║  ███╗███████║   ██║   ${R}`,
    `${B2}${B}██║     ██║   ██║██║  ██║██╔══╝      ██║██║╚██╗██║╚════██║██║██║   ██║██╔══██║   ██║   ${R}`,
    `${B1}${B}╚██████╗╚██████╔╝██████╔╝███████╗    ██║██║ ╚████║███████║██║╚██████╔╝██║  ██║   ██║   ${R}`,
    `${B1}${B} ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ${R}`,
  ]

  console.log()
  art.forEach((line) => console.log('  ' + line))
  console.log()
  console.log(`  ${B}${B1}Code Insight${R}   ${DIM}—  AI developer analytics for Kroger Engineering${R}`)
  console.log()
}

function findFreePort(port = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(findFreePort(port + 1)))
    server.listen(port, () => server.close(() => resolve(port)))
  })
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`
  exec(cmd)
}

// Source dirs/files to mirror into ~/.code-insight/
const SRC_DIRS  = ['app', 'components', 'lib', 'types', 'public']
const SRC_FILES = ['next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'components.json']

function syncSource(pkg) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  for (const dir of SRC_DIRS) {
    const src = path.join(PKG_DIR, dir)
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(CACHE_DIR, dir), { recursive: true, force: true })
    }
  }
  for (const file of SRC_FILES) {
    const src = path.join(PKG_DIR, file)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(CACHE_DIR, file))
    }
  }
  fs.writeFileSync(path.join(CACHE_DIR, 'package.json'), JSON.stringify({
    name: 'code-insight-runtime',
    version: pkg.version,
    dependencies: pkg.dependencies,
  }, null, 2))
}

async function main() {
  printBanner()

  const pkg = require(path.join(PKG_DIR, 'package.json'))

  const versionFile = path.join(CACHE_DIR, '.code-insight-version')
  const cachedVersion = fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, 'utf8').trim()
    : null

  const nextCli = path.join(CACHE_DIR, 'node_modules', 'next', 'dist', 'bin', 'next')
  const needsSetup = cachedVersion !== pkg.version || !fs.existsSync(nextCli)

  if (needsSetup) {
    console.log(`  ${DIM}Setting up (first run, may take a minute)…${R}\n`)
    syncSource(pkg)

    await new Promise((resolve, reject) => {
      const install = spawn('npm', ['install', '--prefer-offline', '--no-package-lock'], {
        cwd: CACHE_DIR,
        stdio: 'inherit',
        shell: true,
      })
      install.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`npm install failed (exit ${code})`))
      )
    })

    fs.writeFileSync(versionFile, pkg.version)
  }

  const port = await findFreePort(3000)
  const url  = `http://localhost:${port}`

  console.log(`  ${DIM}Starting server on${R} ${B2}${B}${url}${R}\n`)

  const child = spawn(process.execPath, [nextCli, 'dev', '--port', String(port)], {
    cwd: CACHE_DIR,
    stdio: [process.platform === 'win32' ? 'ignore' : 'inherit', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
  })

  let opened = false

  function checkReady(text) {
    if (!opened && /Local:|ready|started server/i.test(text)) {
      opened = true
      console.log(`\n  ${B1}✓${R}  Opening ${B}${url}${R} in your browser…\n`)
      openBrowser(url)
    }
  }

  child.stdout.on('data', (d) => { process.stdout.write(d); checkReady(d.toString()) })
  child.stderr.on('data', (d) => { process.stderr.write(d); checkReady(d.toString()) })

  child.on('exit', (code) => process.exit(code ?? 0))

  process.on('SIGINT',  () => { child.kill(); process.exit(0) })
  process.on('SIGTERM', () => { child.kill(); process.exit(0) })
}

main().catch((err) => { console.error(err); process.exit(1) })
