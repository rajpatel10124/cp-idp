const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoUrl = 'https://github.com/rajpatel10124/mern-ecommerce.git';
const targetDir = path.resolve(__dirname, 'mern-debug');

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

execSync(`git clone --depth 1 "${repoUrl}" "${targetDir}"`);

const result = {
  files: fs.readdirSync(targetDir),
  dockerfile: fs.existsSync(path.join(targetDir, 'Dockerfile')) ? fs.readFileSync(path.join(targetDir, 'Dockerfile'), 'utf8') : null,
  packageJson: fs.existsSync(path.join(targetDir, 'package.json')) ? fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8') : null,
  subdirs: [],
};

const entries = fs.readdirSync(targetDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory() && entry.name !== '.git') {
    const subPath = path.join(targetDir, entry.name);
    const subFiles = fs.readdirSync(subPath);
    const subPkg = fs.existsSync(path.join(subPath, 'package.json')) ? fs.readFileSync(path.join(subPath, 'package.json'), 'utf8') : null;
    const subDock = fs.existsSync(path.join(subPath, 'Dockerfile')) ? fs.readFileSync(path.join(subPath, 'Dockerfile'), 'utf8') : null;
    result.subdirs.push({ name: entry.name, files: subFiles, packageJson: subPkg, dockerfile: subDock });
  }
}

fs.writeFileSync(path.resolve(__dirname, 'mern-info.json'), JSON.stringify(result, null, 2), 'utf8');
console.log('Inspection saved to tmp/mern-info.json');
