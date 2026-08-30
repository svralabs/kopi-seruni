import { NextResponse } from 'next/server';
import openApiSpec from '@/lib/openapi.json';

export async function GET() {
  return NextResponse.json(openApiSpec);
}
