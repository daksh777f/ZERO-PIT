# Race Commentary Audio Files

This directory contains audio files for race commentary that sync with the race replay feature.

## Directory Structure

```
audio/
├── race_1/
│   ├── 1.mp3
│   ├── 2.mp3
│   └── ...
├── race_2/
│   ├── 1.mp3
│   ├── 2.mp3
│   └── ...
└── [other_sessions]/
    └── [event_id].mp3
```

## File Naming Convention

Audio files should be named using the `event_id` from the corresponding `race_commentary_persona.json` file.

For example, if the commentary JSON contains:
```json
{
  "event_type": "race_start",
  "event_id": "1",
  "event_message": "...",
  "elapsed_race_time": 0
}
```

The corresponding audio file should be: `1.mp3`

## Session Folders

Each session folder name should match the session names used in the telemetry data:
- `race_1`
- `race_2`
- `practice_1`
- `practice_2`
- `qualifying`

## Audio Format

- Format: MP3
- Recommended bitrate: 128kbps or higher
- Mono or stereo acceptable

## Playback Behavior

- Audio files are played at the adjusted playback speed (matching the race replay speed)
- If an audio file is missing, the commentary popup will still display the text message
- Audio can be muted using the toggle in the race replay header
- The mute preference is saved in localStorage
