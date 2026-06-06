const fs = require('fs');
const path = require('path');

// File yang aman dihapus — tidak dipakai VSNotes:
// - dxcompiler/dxil: WebGPU shader compiler (tidak pakai WebGPU)
// - vk_swiftshader/vulkan: Vulkan software renderer (tidak pakai Vulkan)
// - d3dcompiler_47: shader compiler legacy (tidak dibutuhkan Chromium modern)
const UNUSED_FILES = [
  'dxcompiler.dll',
  'dxil.dll',
  'd3dcompiler_47.dll',
  'vk_swiftshader.dll',
  'vk_swiftshader_icd.json',
  'vulkan-1.dll',
];

exports.default = async ({ appOutDir }) => {
  let totalBytes = 0;
  for (const file of UNUSED_FILES) {
    const filePath = path.join(appOutDir, file);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      fs.unlinkSync(filePath);
      totalBytes += size;
      console.log(`  afterPack: removed ${file} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    }
  }
  console.log(`  afterPack: total removed ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
};
