import path   from 'path';
import fs  from 'fs';
import { exec, execSync } from 'child_process';

const debug=true;

const versionPattern = "<#VERSION#>";

function ab2str(buf, debug=false) {
    if (debug) {
      console.log(`converting output to string , length is ${buf.length}`);
    }
    const uint8Array = new Uint8Array(buf);
    if (debug) {
      console.log(`buffer converted to Uint8Array`);
    }
    const data = uint8Array.reduce((acc, i) => acc += String.fromCharCode.apply(null, [i]), '');
    if (debug) {
      console.log(`uint8aray reduced to string >>>${data}<<<`);
    }
    return data;
  }

function extractSha1(buffer) {
    var gitOutput = ab2str(buffer,false);
    return gitOutput;
}

function setVersion(sha1,workerTemplatePath, workerPath, versionFilePath) {
    const versionData = {version:sha1};
    fs.writeFileSync(versionFilePath,JSON.stringify(versionData));
    let workerRawContent = fs.readFileSync(workerTemplatePath);
    let workerContent = ab2str(workerRawContent,false);
    workerContent = workerContent.replace(versionPattern,sha1);
    fs.writeFileSync(workerPath,workerContent);
}

try {
    var git = execSync(`git rev-parse --short HEAD`);
    console.log(`git suceeded`);
    if (debug) {
      console.log('git raw output :');
      console.log(git);
    }
    let sha1 = extractSha1(git).replace('\n','').replace('\r','');
    console.log(`current has is ${sha1}`);
    setVersion(sha1,'./public/worker_template.js','./public/worker.js','public/version.json');
  } catch (error) {
    console.log(error);
  }