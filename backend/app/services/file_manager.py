import os
import aiofiles
import re
from typing import Optional

class FileManager:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def sanitize_name(self, name: str) -> str:
        # Replace invalid characters with underscore
        sanitized = re.sub(r'[\\/:*?"<>|]', '_', name)
        
        # Truncate to max 200 characters to ensure full path stays under 255
        # (leaving room for directory path, extension, etc.)
        max_length = 200
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized


    def ensure_directory(self, path: str):
        os.makedirs(path, exist_ok=True)

    async def write_strm(self, path: str, url: str):
        async with aiofiles.open(path, 'w') as f:
            await f.write(url)

    async def write_nfo(self, path: str, content: str):
        async with aiofiles.open(path, 'w') as f:
            await f.write(content)

    async def delete_file(self, path: str):
        if os.path.exists(path):
            os.remove(path)

    async def delete_directory_if_empty(self, path: str):
        try:
            os.rmdir(path)
        except OSError:
            pass # Directory not empty

    def generate_movie_nfo(self, movie_data: dict) -> str:
        """Generate NFO file for a movie - TMDB ID only if available, otherwise just the title"""
        tmdb_id = movie_data.get('tmdb', '')  # Xtream API uses 'tmdb' not 'tmdb_id'
        title = movie_data.get('name', 'Unknown')
        
        # Check if TMDB ID is valid (not empty, not null, not 0, not "0")
        has_valid_tmdb = False
        if tmdb_id:
            tmdb_str = str(tmdb_id).strip()
            if tmdb_str and tmdb_str.lower() not in ['null', 'none', '0', '']:
                try:
                    # Verify it's a valid number and not zero
                    if int(tmdb_str) > 0:
                        has_valid_tmdb = True
                except (ValueError, TypeError):
                    pass
        
        # If we have a valid TMDB ID, use minimal NFO with just the ID
        if has_valid_tmdb:
            return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<movie>
  <tmdbid>{tmdb_id}</tmdbid>
  <uniqueid type="tmdb" default="true">{tmdb_id}</uniqueid>
</movie>"""
        
        # Otherwise, use all available Xtream metadata
        plot = movie_data.get('plot', movie_data.get('description', ''))
        year = movie_data.get('year', movie_data.get('releasedate', ''))
        rating = movie_data.get('rating', movie_data.get('rating_5based', ''))
        genre = movie_data.get('genre', '')
        director = movie_data.get('director', '')
        cast_list = movie_data.get('cast', '')
        duration = movie_data.get('duration', '')
        trailer = movie_data.get('youtube_trailer', '')
        cover = movie_data.get('cover_big', movie_data.get('backdrop_path_original', ''))
        
        # Convert rating from 5-based to 10-based if needed
        if rating and str(rating_5based := movie_data.get('rating_5based')):
            try:
                rating = float(rating_5based) * 2
            except (ValueError, TypeError):
                pass
        
        nfo = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>\n<movie>\n'
        
        # Essential fields
        nfo += f'  <title>{self._escape_xml(title)}</title>\n'
        
        if plot:
            nfo += f'  <plot>{self._escape_xml(plot)}</plot>\n'
            nfo += f'  <outline>{self._escape_xml(plot[:200])}</outline>\n'
        
        if year:
            # Extract year if it's a full date
            year_str = str(year)[:4] if len(str(year)) >= 4 else str(year)
            nfo += f'  <year>{year_str}</year>\n'
        
        if rating:
            try:
                nfo += f'  <rating>{float(rating)}</rating>\n'
            except (ValueError, TypeError):
                pass
        
        # Genre
        if genre:
            for g in str(genre).split(','):
                nfo += f'  <genre>{self._escape_xml(g.strip())}</genre>\n'
        
        # Director
        if director:
            nfo += f'  <director>{self._escape_xml(director)}</director>\n'
        
        # Cast
        if cast_list:
            for actor in str(cast_list).split(','):
                actor_name = actor.strip()
                if actor_name:
                    nfo += f'  <actor><name>{self._escape_xml(actor_name)}</name></actor>\n'
        
        # Duration (in minutes)
        if duration:
            try:
                # Duration might be in format "HH:MM:SS" or just minutes
                if ':' in str(duration):
                    parts = str(duration).split(':')
                    total_mins = int(parts[0]) * 60 + int(parts[1])
                else:
                    total_mins = int(duration)
                nfo += f'  <runtime>{total_mins}</runtime>\n'
            except (ValueError, TypeError, IndexError):
                pass
        
        # Trailer
        if trailer:
            nfo += f'  <trailer>plugin://plugin.video.youtube/?action=play_video&amp;videoid={trailer}</trailer>\n'
        
        # Artwork
        if cover:
            nfo += f'  <thumb>{cover}</thumb>\n'
            nfo += f'  <fanart><thumb>{cover}</thumb></fanart>\n'
        
        nfo += '</movie>'
        return nfo


    def generate_show_nfo(self, series_data: dict) -> str:
        """Generate NFO file for a TV show - TMDB ID only if available, otherwise just the title"""
        tmdb_id = series_data.get('tmdb', '')  # Xtream API uses 'tmdb' not 'tmdb_id'
        title = series_data.get('name', 'Unknown')
        
        # Check if TMDB ID is valid (not empty, not null, not 0, not "0")
        has_valid_tmdb = False
        if tmdb_id:
            tmdb_str = str(tmdb_id).strip()
            if tmdb_str and tmdb_str.lower() not in ['null', 'none', '0', '']:
                try:
                    # Verify it's a valid number and not zero
                    if int(tmdb_str) > 0:
                        has_valid_tmdb = True
                except (ValueError, TypeError):
                    pass
        
        # If we have a valid TMDB ID, use minimal NFO with just the ID
        if has_valid_tmdb:
            return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<tvshow>
  <tmdbid>{tmdb_id}</tmdbid>
  <uniqueid type="tmdb" default="true">{tmdb_id}</uniqueid>
</tvshow>"""
        
        # Otherwise, use all available Xtream metadata
        plot = series_data.get('plot', series_data.get('description', ''))
        year = series_data.get('year', series_data.get('releaseDate', ''))
        rating = series_data.get('rating', series_data.get('rating_5based', ''))
        genre = series_data.get('genre', '')
        cast_list = series_data.get('cast', '')
        director = series_data.get('director', '')
        cover = series_data.get('cover_big', series_data.get('backdrop_path_original', ''))
        
        # Convert rating from 5-based to 10-based if needed
        if rating and str(rating_5based := series_data.get('rating_5based')):
            try:
                rating = float(rating_5based) * 2
            except (ValueError, TypeError):
                pass
        
        nfo = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>\n<tvshow>\n'
        
        nfo += f'  <title>{self._escape_xml(title)}</title>\n'
        
        if plot:
            nfo += f'  <plot>{self._escape_xml(plot)}</plot>\n'
        
        if year:
            year_str = str(year)[:4] if len(str(year)) >= 4 else str(year)
            nfo += f'  <year>{year_str}</year>\n'
            nfo += f'  <premiered>{year_str}</premiered>\n'
        
        if rating:
            try:
                nfo += f'  <rating>{float(rating)}</rating>\n'
            except (ValueError, TypeError):
                pass
        
        if genre:
            for g in str(genre).split(','):
                nfo += f'  <genre>{self._escape_xml(g.strip())}</genre>\n'
        
        if director:
            nfo += f'  <director>{self._escape_xml(director)}</director>\n'
        
        if cast_list:
            for actor in str(cast_list).split(','):
                actor_name = actor.strip()
                if actor_name:
                    nfo += f'  <actor><name>{self._escape_xml(actor_name)}</name></actor>\n'
        
        if cover:
            nfo += f'  <thumb>{cover}</thumb>\n'
            nfo += f'  <fanart><thumb>{cover}</thumb></fanart>\n'
        
        nfo += '</tvshow>'
        return nfo



    def _escape_xml(self, text: str) -> str:
        """Escape XML special characters"""
        if not text:
            return ''
        return (str(text)
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&apos;'))
