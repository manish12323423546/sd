"""
Shared settings for the "Jungle Night Chase" Unreal Engine scripts.

Edit the asset paths below to point at the assets in YOUR project
(Fab / Megascans / your own car models). Every other script imports
this file, so this is the only place you should need to change paths.

Tested against the Unreal Engine 5.5+ Python API (Editor Scripting).
"""

# --------------------------------------------------------------------------
# Content paths (change these to match your project)
# --------------------------------------------------------------------------
CONTENT_ROOT = "/Game/JungleChase"
SEQUENCE_DIR = CONTENT_ROOT + "/Cinematics"
SEQUENCE_NAME = "SEQ_JungleChase_Master"
MAP_PATH = CONTENT_ROOT + "/Maps/L_JungleChase"  # the level that holds the road

# Hero car and chaser. Use a Chaos Wheeled Vehicle Blueprint or, for pure
# cinematics, a Skeletal/Static Mesh car. Leave as None to spawn placeholder cubes.
HERO_CAR_CLASS = CONTENT_ROOT + "/Vehicles/BP_HeroSupercar.BP_HeroSupercar_C"
CHASER_CAR_CLASS = CONTENT_ROOT + "/Vehicles/BP_ChaserSUV.BP_ChaserSUV_C"

# Spawn script-made headlights/tail lights/searchlight on the cars. Set False if
# your car Blueprints already have their own lights.
ADD_CAR_LIGHTS = True

# Optional IES profile for realistic headlight beams (UE ships a few in Engine Content).
HEADLIGHT_IES = "/Engine/EngineMaterials/IESProfiles/IES_Spot.IES_Spot"

# --------------------------------------------------------------------------
# Timing
# --------------------------------------------------------------------------
FPS = 24  # cinematic frame rate; use 30/60 if you want a game-trailer feel
DURATION_SECONDS = 60  # length of the master sequence

# --------------------------------------------------------------------------
# Road path (blockout). Units are centimetres (Unreal default).
# A winding jungle road ~5 km long (60 s at 260 km/h needs ~4.5 km).
# Replace with points sampled from your landscape road spline once the
# environment is built (see docs/02-environment.md and 00_export_road_points.py).
# If the road is too short, the scripts automatically slow the cars down.
# Format: (X, Y, Z)
# --------------------------------------------------------------------------
ROAD_POINTS = [
    (0, 0, 0),
    (40000, 3000, 150),
    (80000, -5000, 400),
    (120000, -12000, 600),
    (160000, -6000, 500),
    (200000, 8000, 300),
    (240000, 18000, 200),
    (280000, 12000, 350),
    (320000, -2000, 700),
    (360000, -8000, 1100),  # crest -> jump
    (400000, -4000, 600),
    (440000, 6000, 400),
    (480000, 10000, 300),
    (520000, 4000, 250),
]

HERO_SPEED_KMH = 260  # average hero speed during the chase
CHASER_GAP_SECONDS = 1.2  # how far behind the chaser trails (time gap)

# --------------------------------------------------------------------------
# Lighting mood: moonlit jungle night
# --------------------------------------------------------------------------
MOON_INTENSITY_LUX = 0.6  # physically based moonlight is ~0.1-1 lux
MOON_COLOR = (0.62, 0.72, 1.0)  # cool blue
MOON_ROTATION = (-28.0, 35.0, 0.0)  # (pitch, yaw, roll) - low raking light through canopy
MOON_TEMPERATURE = 7800.0
FOG_DENSITY = 0.035
FOG_HEIGHT_FALLOFF = 0.35
FOG_INSCATTER = (0.04, 0.06, 0.09)
EXPOSURE_BIAS = 1.5  # with manual exposure; night scenes need a lift

# --------------------------------------------------------------------------
# Render output
# --------------------------------------------------------------------------
OUTPUT_DIR = "{project_dir}/Saved/MovieRenders/JungleChase"
OUTPUT_RESOLUTION = (3840, 2160)  # 4K UHD; use (3840, 1608) with the scope filmback below
FILMBACK_MM = (36.0, 20.25)  # full-frame 16:9; (36.0, 15.06) for 2.39:1 scope
SHUTTER_ANGLE = 180.0  # film-standard motion blur
SPATIAL_SAMPLES = 1
TEMPORAL_SAMPLES = 16  # 16-32 gives clean motion blur at 24fps
WARMUP_FRAMES = 32  # lets Lumen / TSR / Niagara settle before frame 1
USE_PATH_TRACER = False  # True for hero shots only (very slow)
