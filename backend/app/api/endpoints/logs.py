from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.api import deps
import asyncio
import os
import subprocess
from typing import AsyncGenerator

router = APIRouter()

async def log_stream() -> AsyncGenerator[str, None]:
    """Stream logs from app.log file"""
    log_file = "app.log"
    
    # Create file if it doesn't exist
    if not os.path.exists(log_file):
        open(log_file, 'a').close()

    try:
        # Use tail -f to follow the file
        process = await asyncio.create_subprocess_exec(
            'tail', '-f', '-n', '100', log_file,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        if process.stdout:
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                yield f"data: {line.decode('utf-8', errors='replace')}\n\n"
    except Exception as e:
        yield f"data: Error reading logs: {str(e)}\n\n"

@router.get("/stream")
async def stream_logs(token: str):
    """Stream logs using Server-Sent Events (SSE)"""
    # Manually validate the token since EventSource can't send custom headers
    try:
        deps.get_current_user(token)
    except Exception:
        from fastapi import Response
        return Response(content="Unauthorized", status_code=401)
    
    return StreamingResponse(
        log_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
