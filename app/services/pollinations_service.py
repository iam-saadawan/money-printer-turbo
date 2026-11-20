"""
Pollinations.ai Image Generation Service for MoneyPrinterTurbo.
Generates 9:16 vertical high-resolution AI images and converts them
to dynamic Ken Burns zoom video clips for video production.
"""

import os
import random
import time
import urllib.parse
from pathlib import Path
from typing import List, Optional

import requests
from loguru import logger

from app.config import config
from app.utils import utils


class PollinationsService:
    def __init__(self):
        pass

    @property
    def api_key(self) -> str:
        return (config.app.get("pollinations_api_key") or "").strip()

    def generate_image(
        self,
        prompt: str,
        output_path: str,
        width: int = 1080,
        height: int = 1920,
        seed: Optional[int] = None,
        timeout: int = 45,
    ) -> bool:
        """
        Generate a single image from Pollinations.ai and save it to output_path.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            return False

        if seed is None:
            seed = random.randint(1000, 999999)

        encoded_prompt = urllib.parse.quote(clean_prompt)
        api_key = self.api_key

        endpoints = [
            (
                f"https://gen.pollinations.ai/image/{encoded_prompt}?key={api_key}&model=flux&width={width}&height={height}&nologo=true&seed={seed}"
                if api_key
                else f"https://image.pollinations.ai/prompt/{encoded_prompt}?model=flux&width={width}&height={height}&nologo=true&seed={seed}",
                {"Authorization": f"Bearer {api_key}"} if api_key else {},
            ),
            (
                f"https://image.pollinations.ai/prompt/{encoded_prompt}?model=flux&width={width}&height={height}&nologo=true&seed={seed}",
                {"Authorization": f"Bearer {api_key}"} if api_key else {},
            ),
        ]

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        for attempt, (url, headers) in enumerate(endpoints, 1):
            try:
                logger.info(
                    f"🎨 Generating Pollinations AI image (attempt {attempt}/2): '{clean_prompt[:50]}...' [Seed: {seed}]"
                )
                resp = requests.get(url, headers=headers, timeout=timeout)

                if resp.status_code == 200 and len(resp.content) > 5000:
                    with open(output_path, "wb") as f:
                        f.write(resp.content)
                    logger.success(
                        f"✅ AI Image generated ({len(resp.content)} bytes): {output_path}"
                    )
                    return True
                elif resp.status_code in (402, 429):
                    logger.warning(
                        f"⚠️ Pollinations credit / rate limit ({resp.status_code}): {resp.text[:100]}"
                    )
                    break
                else:
                    logger.warning(
                        f"Pollinations returned status {resp.status_code}: {resp.text[:100]}"
                    )
            except requests.exceptions.Timeout:
                logger.warning(f"Pollinations request timed out ({timeout}s) on attempt {attempt}")
            except Exception as e:
                logger.warning(f"Pollinations request error on attempt {attempt}: {e}")

            time.sleep(2)

        return False

    def convert_image_to_video_clip(
        self,
        image_path: str,
        output_mp4: str,
        clip_duration: float = 3.0,
    ) -> bool:
        """
        Convert a vertical image into a smooth Ken Burns dynamic zoom MP4 clip.
        """
        try:
            from moviepy.video.VideoClip import ImageClip
            from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip

            clip = ImageClip(image_path).with_duration(clip_duration).with_position("center")
            # Smooth 10% zoom in over clip_duration
            zoom_clip = clip.resized(lambda t: 1.0 + (clip_duration * 0.025) * (t / clip.duration))
            final_clip = CompositeVideoClip([zoom_clip])
            final_clip.write_videofile(
                output_mp4,
                fps=30,
                codec="libx264",
                audio=False,
                preset="ultrafast",
                logger=None,
            )
            clip.close()
            final_clip.close()
            return os.path.exists(output_mp4) and os.path.getsize(output_mp4) > 1000
        except Exception as e:
            logger.warning(f"Failed to convert AI image {image_path} to video: {e}")
            return False

    def generate_hero_video_clips(
        self,
        task_id: str,
        search_terms: List[str],
        max_clips: int = 4,
        clip_duration: float = 3.0,
    ) -> List[str]:
        """
        Generate up to max_clips hero AI video clips with camera motion for the given search terms.
        Spreads terms across the narrative arc (hook, development, twist, climax).
        """
        if not search_terms or not self.api_key:
            return []

        task_dir = utils.task_dir(task_id)
        n_terms = len(search_terms)

        # Distribute indices across the narrative beats
        if n_terms <= max_clips:
            selected_indices = list(range(n_terms))
        else:
            step = n_terms / max_clips
            selected_indices = [int(i * step) for i in range(max_clips)]

        ai_video_clips = []
        for count, idx in enumerate(selected_indices, 1):
            term = search_terms[idx]
            base_name = f"pollinations_hero_{count}_{int(time.time())}"
            img_path = os.path.join(task_dir, f"{base_name}.jpg")
            mp4_path = os.path.join(task_dir, f"{base_name}.mp4")

            prompt = (
                f"{term}, hyperrealistic cinematic still, 8k resolution, photorealistic, "
                f"unreal engine 5 render, dramatic atmospheric volumetric lighting, vertical 9:16 composition"
            )

            success = self.generate_image(prompt=prompt, output_path=img_path)
            if success and os.path.exists(img_path):
                # Convert to dynamic zoom video clip
                converted = self.convert_image_to_video_clip(
                    image_path=img_path,
                    output_mp4=mp4_path,
                    clip_duration=clip_duration,
                )
                if converted and os.path.exists(mp4_path):
                    logger.success(f"🎬 Hero AI video clip #{count} ready: {mp4_path}")
                    ai_video_clips.append(mp4_path)

            if count < len(selected_indices):
                time.sleep(1.0)

        logger.info(f"✨ Successfully produced {len(ai_video_clips)}/{max_clips} hero AI video clips for task {task_id}")
        return ai_video_clips


pollinations_service = PollinationsService()
