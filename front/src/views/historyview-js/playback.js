import { ElMessage } from 'element-plus'

export function createPlaybackHandler(data, t) {
  // 开始回放
  const startPlayback = () => {
    if (data.trajectoryData.value.length === 0) {
      ElMessage.warning(t('history.noDataToPlayback'))
      return
    }
    
    data.isPlaying.value = true
    data.playbackTimer.value = setInterval(() => {
      if (data.currentPlayIndex.value < data.trajectoryData.value.length - 1) {
        data.currentPlayIndex.value++
      } else {
        // 回放结束
        stopPlayback()
        ElMessage.success(t('history.playbackComplete'))
      }
    }, 1000 / data.playbackSpeed.value) // 根据速度调整间隔
  }

  // 暂停回放
  const pausePlayback = () => {
    data.isPlaying.value = false
    if (data.playbackTimer.value) {
      clearInterval(data.playbackTimer.value)
      data.playbackTimer.value = null
    }
  }

  // 停止回放
  const stopPlayback = () => {
    data.isPlaying.value = false
    data.currentPlayIndex.value = 0
    if (data.playbackTimer.value) {
      clearInterval(data.playbackTimer.value)
      data.playbackTimer.value = null
    }
  }

  // 进度条变化处理
  const handleProgressChange = (value) => {
    data.currentPlayIndex.value = value
    if (data.isPlaying.value) {
      // 如果正在播放，重新开始定时器
      pausePlayback()
      startPlayback()
    }
  }

  return {
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleProgressChange
  }
}
