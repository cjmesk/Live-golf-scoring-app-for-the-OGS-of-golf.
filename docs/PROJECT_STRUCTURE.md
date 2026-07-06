# OG's Golf Project Structure

```text
OGS Golf
|
├── players
├── courses
├── rounds
├── images
├── docs
└── backups
```

## Folders

`players` is for OGS member records, player exports, handicap snapshots, and future player profile data.

`courses` is for course scorecards, tee rating data, yardages, and course-specific setup notes.

`rounds` is for saved round files, completed scorecards, game results, and payout summaries.

`images` is for logos, scorecard photos, course images, and app icons.

`docs` is for planning notes, architecture notes, and plain-English explanations of how the app works.

`backups` is for manual copies before large changes.

## App Code

The working app code still lives in `src`. That keeps the app engine separate from league records and documents.
