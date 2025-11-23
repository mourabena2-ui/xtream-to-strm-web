import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.xtream import XtreamClient
from app.services.file_manager import FileManager
from app.tasks.sync import process_movies
from app.models.cache import MovieCache

class TestXtreamClient(unittest.TestCase):
    def setUp(self):
        self.client = XtreamClient("http://test.com", "user", "pass")

    @patch('httpx.AsyncClient')
    def test_get_vod_categories(self, mock_client_cls):
        # Mock the context manager
        mock_client_instance = MagicMock()
        mock_client_cls.return_value = mock_client_instance
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.__aexit__.return_value = None

        # Mock the get response
        mock_response = MagicMock()
        mock_response.json.return_value = [{"category_id": "1", "category_name": "Action"}]
        mock_response.raise_for_status.return_value = None
        
        # Make client.get return an awaitable that returns mock_response
        mock_client_instance.get.return_value = AsyncMock(return_value=mock_response)()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(self.client.get_vod_categories())
        loop.close()
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['category_name'], 'Action')

    def test_get_stream_url(self):
        url = self.client.get_stream_url("movie", "123", "mp4")
        self.assertEqual(url, "http://test.com/movie/user/pass/123.mp4")

class TestSyncLogic(unittest.TestCase):
    @patch('app.services.xtream.XtreamClient.get_vod_categories')
    @patch('app.services.xtream.XtreamClient.get_vod_streams')
    @patch('app.services.file_manager.FileManager.write_strm')
    def test_process_movies_add(self, mock_write, mock_get_streams, mock_get_cats):
        # Setup Mocks - these are async methods on the class, so we mock them to return awaitables
        mock_get_cats.return_value = [{"category_id": "1", "category_name": "Action"}]
        mock_get_streams.return_value = [
            {"stream_id": "100", "name": "Test Movie", "container_extension": "mp4", "category_id": "1", "tmdb_id": "123"}
        ]
        
        db = MagicMock()
        # Mock cache query to return empty (so it adds)
        db.query.return_value.all.return_value = []
        # Mock SyncState query
        db.query.return_value.filter.return_value.first.return_value = MagicMock()
        # Mock SelectedCategory query (filter().all()) to return empty list so it doesn't filter out movies
        db.query.return_value.filter.return_value.all.return_value = []

        xc = XtreamClient("http://test.com", "user", "pass")
        fm = FileManager("/tmp/output")
        fm.ensure_directory = MagicMock()
        fm.write_strm = AsyncMock()
        fm.write_nfo = AsyncMock()

        # Run
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(process_movies(db, xc, fm))
        loop.close()

        # Verify
        # Should have called write_strm
        fm.write_strm.assert_called_once()
        args = fm.write_strm.call_args[0]
        self.assertTrue(args[0].endswith("Test Movie.strm"))
        self.assertIn("100.mp4", args[1])

if __name__ == '__main__':
    unittest.main()
