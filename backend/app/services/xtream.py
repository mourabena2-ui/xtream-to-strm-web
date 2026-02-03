import httpx
from typing import List, Dict, Optional, Any
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

logger = logging.getLogger(__name__)

class XtreamClient:
    def __init__(self, url: str, username: str, password: str):
        self.base_url = url.rstrip("/")
        self.username = username
        self.password = password
        self.api_url = f"{self.base_url}/player_api.php"

    def _get_params(self, action: str, **kwargs) -> Dict[str, str]:
        params = {
            "username": self.username,
            "password": self.password,
            "action": action
        }
        params.update(kwargs)
        return params

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _request(self, action: str, **kwargs) -> Any:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            params = self._get_params(action, **kwargs)
            try:
                response = await client.get(self.api_url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error for {action}: {e}")
                raise
            except Exception as e:
                logger.error(f"Error fetching {action}: {e}")
                raise

    async def get_vod_categories(self) -> List[Dict]:
        return await self._request("get_vod_categories")

    async def get_vod_streams(self, category_id: Optional[str] = None) -> List[Dict]:
        kwargs = {}
        if category_id:
            kwargs["category_id"] = category_id
        return await self._request("get_vod_streams", **kwargs)

    async def get_series_categories(self) -> List[Dict]:
        return await self._request("get_series_categories")

    async def get_series(self, category_id: Optional[str] = None) -> List[Dict]:
        kwargs = {}
        if category_id:
            kwargs["category_id"] = category_id
        return await self._request("get_series", **kwargs)

    async def get_series_info(self, series_id: str) -> Dict:
        return await self._request("get_series_info", series_id=series_id)

    async def get_vod_info(self, vod_id: str) -> Dict:
        return await self._request("get_vod_info", vod_id=vod_id)

    def get_stream_url(self, stream_type: str, stream_id: str, extension: str) -> str:
        # stream_type: "movie" or "series"
        return f"{self.base_url}/{stream_type}/{self.username}/{self.password}/{stream_id}.{extension}"
