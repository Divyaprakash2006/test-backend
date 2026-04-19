const { exec, spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '../../tmp/code-exec');

/**
 * Executes code for various languages
 * @param {string} code - source code
 * @param {string} lang - javascript | python | cpp | java
 * @param {string} input - stdin input
 * @returns {Promise<{output: string, error: string, timeout: boolean}>}
 */
const runCode = async (code, lang, input = '') => {
  const id = uuidv4();
  const workDir = path.join(TEMP_DIR, id);
  await fs.mkdir(workDir, { recursive: true });
  
  let filename, compileCmd, runCmd;

  try {
    switch (lang.toLowerCase()) {
      case 'javascript':
        filename = 'solution.js';
        await fs.writeFile(path.join(workDir, filename), code);
        runCmd = `node ${filename}`;
        break;
      case 'python':
        filename = 'solution.py';
        await fs.writeFile(path.join(workDir, filename), code);
        runCmd = `python ${filename}`;
        break;
      case 'cpp':
        filename = 'solution.cpp';
        const exeName = 'solution.exe';
        await fs.writeFile(path.join(workDir, filename), code);
        compileCmd = `g++ ${filename} -o ${exeName}`;
        runCmd = `${exeName}`;
        break;
      case 'java':
        // Java requires filename to match Public Class name.
        const classMatch = code.match(/public\s+class\s+([a-zA-Z0-9_$]+)/);
        let javaClassName = classMatch ? classMatch[1] : 'Solution';
        
        filename = `${javaClassName}.java`;
        const wrappedCode = classMatch ? code : `public class ${javaClassName} { \n  public static void main(String[] args) { \n    ${code} \n  } \n}`;
        
        await fs.writeFile(path.join(workDir, filename), wrappedCode);
        compileCmd = `javac ${filename}`;
        runCmd = `java ${javaClassName}`;
        break;
      default:
        throw new Error('Unsupported language');
    }

    // Compile if needed
    if (compileCmd) {
      await new Promise((resolve, reject) => {
        exec(compileCmd, { cwd: workDir }, (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve();
        });
      });
    }

    // Run with timeout
    const result = await new Promise((resolve) => {
      const child = exec(runCmd, { cwd: workDir, timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
        if (err && err.killed) {
          resolve({ output: '', error: 'Execution Timed Out (5s)', timeout: true });
        } else {
          resolve({ output: stdout, error: stderr || (err ? err.message : ''), timeout: false });
        }
      });
      if (input) {
        child.stdin.write(input);
      }
      child.stdin.end();
    });

    return result;

  } catch (err) {
    return { output: '', error: err.message, timeout: false };
  } finally {
    // Cleanup the entire work directory
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

module.exports = { runCode };
