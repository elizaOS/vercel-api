import { NextResponse } from 'next/server';
import { parseRegistry } from '@/lib/parse-registry';
import { CachedRegistry } from '@/lib/types';

// In-memory cache
let cachedData: CachedRegistry | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function GET() {
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached registry data');
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          'Content-Type': 'application/json',
        },
      });
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured on server' },
        { status: 500 }
      );
    }

    console.log('Parsing registry data...');
    
    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Registry parsing timeout')), 25000)
    );

    const parsePromise = parseRegistry(githubToken);
    
    // Race between parsing and timeout
    const result = await Promise.race([parsePromise, timeoutPromise]) as CachedRegistry;
    
    // Update cache
    cachedData = result;
    cacheTimestamp = now;
    
    console.log('Registry parsing completed successfully');

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'Content-Type': 'application/json',
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Registry parsing failed:', errorMessage);
    
    // If we have stale cached data, return it with a warning
    if (cachedData) {
      console.log('Returning stale cached data due to error');
      return NextResponse.json({
        ...cachedData,
        warning: 'Data may be stale due to parsing error',
        error: errorMessage,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          'Content-Type': 'application/json',
        },
      });
    }

    return NextResponse.json(
      { 
        error: 'Failed to parse registry',
        message: errorMessage,
        lastUpdatedAt: new Date().toISOString(),
        registry: {}
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Handle CORS for cross-origin requests
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}