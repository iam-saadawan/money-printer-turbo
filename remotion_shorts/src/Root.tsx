import React from "react";
import { Composition } from "remotion";
import { GhostShort, GHOST_FRAMES } from "./videos/ghost/Ghost";
import { GoldShort, GOLD_FRAMES } from "./videos/gold/Gold";
import { AgloeShort, AGLOE_FRAMES } from "./videos/agloe/Agloe";
import { AgTest, AGTEST_FRAMES } from "./videos/agtest/AgTest";
import { BlendTest, BLENDTEST_FRAMES } from "./videos/agtest/BlendTest";
import { AgloeB, AGLOEB_FRAMES } from "./videos/agtest/AgloeB";
import { AYCast, CAST } from "./videos/agtest/AYCast";
import { PhoneTest, PHONE_TEST_FRAMES } from "./videos/phone/PhoneTest";
import { Probe } from "./videos/probe/Probe";
import { PaintedTest, PAINTED_FRAMES } from "./videos/painted/PaintedTest";
import { Office3DTest, OFFICE3D_FRAMES } from "./videos/painted/Office3DTest";
import { RatShort, RAT_FRAMES } from "./videos/rat/Rat";
import { AlcatrazShort, ALC_FRAMES } from "./videos/alcatraz/Alcatraz";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Probe" component={Probe} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="PhoneTest" component={PhoneTest} durationInFrames={PHONE_TEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AYCast" component={AYCast} durationInFrames={CAST.length} fps={30} width={600} height={900} />
    <Composition id="AgloeB" component={AgloeB} durationInFrames={AGLOEB_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BlendTest" component={BlendTest} durationInFrames={BLENDTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AgTest" component={AgTest} durationInFrames={AGTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AgloeShort" component={AgloeShort} durationInFrames={AGLOE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GoldShort" component={GoldShort} durationInFrames={GOLD_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GhostShort" component={GhostShort} durationInFrames={GHOST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="PaintedTest" component={PaintedTest} durationInFrames={PAINTED_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Office3DTest" component={Office3DTest} durationInFrames={OFFICE3D_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RatShort" component={RatShort} durationInFrames={RAT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AlcatrazShort" component={AlcatrazShort} durationInFrames={ALC_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
