import enumerateDevices from 'enumerate-devices'

let hasVideoInput: boolean
let doesntSupportEnumerateDevices: boolean

async function _checkVideoInput () {
  try {
    const devices = await enumerateDevices()
    hasVideoInput = devices.some(isVideoInput)
  } catch (err) {
    if (err.kind === 'METHOD_NOT_AVAILABLE' && window.location.protocol === 'http:') {
      // enumerateDevices relies on window.navigator.mediaDevices.enumerateDevices
      // which will be unaccessible in insecure context
      // Assume we have a video input available to allow video feature dev/debug
      console.error(`Can't access navigator.mediaDevices on insecure origin.
This can be fixed in Firefox about:config by setting the following parameters:
  media.devices.insecure.enabled=true
  media.getusermedia.insecure.enabled=true`, err)
    } else {
      console.error('has_video_input error', err)
    }
    hasVideoInput = false
    doesntSupportEnumerateDevices = true
  }
}

let waitForDeviceDetection
export async function checkVideoInput () {
  waitForDeviceDetection = waitForDeviceDetection || _checkVideoInput()
  return waitForDeviceDetection
}

const isVideoInput = device => device.kind === 'videoinput'

export function getDevicesInfo () {
  return { hasVideoInput, doesntSupportEnumerateDevices }
}
