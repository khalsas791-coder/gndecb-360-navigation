import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1200
  },
  server: {
    watch: {
      ignored: [
        '**/main gaate/**',
        '**/00_Main_Exterior/**',
        '**/01_Ground_Floor_Lobby/**',
        '**/02_Hostel_Mess/**',
        '**/03_Floor_1/**',
        '**/04_Floor_2/**',
        '**/05_Floor_3/**',
        '**/06_Floor_4/**',
        '**/07_Floor_5/**',
        '**/canteen/**',
        '**/main gym/**',
        '**/auditorium/**',
        '**/mechanical branch/**',
        '**/main block/**',
        '**/MAIN BLOCK 1/**',
        '**/main block 2/**',
        '**/campus 2nd gate/**',
        '**/college ground/**',
        '**/ADDMISTRATIVE BLOCK/**',
        '**/main block details/**',
        '**/scratch/**',
        '**/dist/**',
        '**/public/**',
        '**/1st year block/**',
        '**/main block details/**'
      ]
    }
  }
});
