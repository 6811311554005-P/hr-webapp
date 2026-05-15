import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

type ExecError = Error & {
  stdout?: Buffer;
  stderr?: Buffer;
};

export async function GET() {
  try {
    const cmd = `"C:\\xampp\\mysql\\bin\\mysql.exe" -u root -h 127.0.0.1 -e "SHOW DATABASES;"`;
    const output = execSync(cmd).toString();
    return NextResponse.json({ success: true, output });
  } catch (e: unknown) {
    const error = e as ExecError;

    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : ''
    });
  }
}
