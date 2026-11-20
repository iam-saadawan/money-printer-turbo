import os
import glob
import subprocess
from app.services import video
from app.models.schema import VideoParams, VideoAspect
from app.utils import utils
from loguru import logger

TASK_ID = "64f98fe7-27db-4f47-a788-889b0c24a9bc"
TASK_DIR = os.path.abspath(f"./storage/tasks/{TASK_ID}")

def assemble():
    audio_path = os.path.join(TASK_DIR, "narration.mp3")
    srt_path = os.path.join(TASK_DIR, "narration.srt")
    raw_video_path = os.path.join(TASK_DIR, "raw_scenes.mp4")
    final_video_path = os.path.join(TASK_DIR, "final_stick_story.mp4")

    # 1. Collect all 26 scene images
    images = [os.path.join(TASK_DIR, f"scene_{i:02d}.jpg") for i in range(1, 27)]
    for img in images:
        if not os.path.exists(img):
            raise FileNotFoundError(f"Missing image: {img}")

    # 2. Get exact audio duration
    probe_cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ]
    total_audio_duration = float(subprocess.check_output(probe_cmd).strip())
    logger.info(f"Total audio duration: {total_audio_duration:.3f}s")

    # 3. Calculate 26 scene durations
    # Distribute total duration across 26 scenes (avg ~4.588s, strictly >= 3.0s)
    num_scenes = len(images)
    base_dur = total_audio_duration / num_scenes
    durations = [round(base_dur, 3)] * num_scenes
    # Adjust last scene to perfectly match total duration
    durations[-1] = round(total_audio_duration - sum(durations[:-1]), 3)

    logger.info(f"Calculated {num_scenes} static scene durations (Each ~{base_dur:.2f}s, sum={sum(durations):.3f}s)")

    # 4. Generate static video clips with FFmpeg (NO ZOOM / NO EXPANSION)
    clip_files = []
    logger.info("🎬 Rendering static scene clips (no zoom, static images)...")
    for idx, (img_path, dur) in enumerate(zip(images, durations), 1):
        clip_file = os.path.join(TASK_DIR, f"clip_{idx:02d}.mp4")
        if not (os.path.exists(clip_file) and os.path.getsize(clip_file) > 1000):
            cmd = [
                "ffmpeg",
                "-y",
                "-loop", "1",
                "-i", img_path,
                "-t", str(dur),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", "30",
                "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                clip_file,
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        clip_files.append(clip_file)

    # 5. Concatenate static clips
    logger.info(f"Concatenating {len(clip_files)} clips...")
    video.concat_video_clips_with_ffmpeg(
        clip_files=clip_files,
        output_file=raw_video_path,
        threads=4,
        output_dir=TASK_DIR,
    )

    # 6. Composite audio (0 BGM) and cartoon subtitles (Yellow with black stroke @ 70%)
    logger.info("Compositing dry voiceover (0 BGM) and high-retention subtitles...")
    video_params = VideoParams(
        video_subject="1904 Olympic Marathon",
        video_aspect=VideoAspect.portrait,
        subtitle_enabled=True,
        subtitle_position="custom",
        custom_position=70.0,
        font_name="MicrosoftYaHeiBold.ttc",
        font_size=60,
        text_fore_color="#FFF200",  # Bright cartoon yellow
        stroke_color="#000000",
        stroke_width=3.5,
        bgm_type="",
        bgm_volume=0.0,  # Pure dry voiceover, NO background music
    )

    success = video.generate_video(
        video_path=raw_video_path,
        audio_path=audio_path,
        subtitle_path=srt_path,
        output_file=final_video_path,
        params=video_params,
    )

    if not success or not os.path.exists(final_video_path):
        raise RuntimeError("Failed to generate final video.")

    final_size_mb = os.path.getsize(final_video_path) / (1024 * 1024)
    logger.success(f"🎉 PILOT VIDEO COMPLETE: {final_video_path} ({final_size_mb:.2f} MB)")
    print("=" * 60)
    print(f"PILOT VIDEO PRODUCED: {final_video_path}")
    print(f"File Size: {final_size_mb:.2f} MB")
    print(f"Duration: {total_audio_duration:.2f}s (~2.0 minutes)")
    print(f"Scenes: {num_scenes} static 2D stick illustrations")
    print("BGM: None (Dry Voiceover)")
    print("Subtitles: Bold Yellow with Black Stroke at 70% Safe Zone")
    print("=" * 60)

if __name__ == "__main__":
    assemble()
