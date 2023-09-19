/*The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const delayInMilliseconds = 200;
document.getElementById('refreshRate').innerText = "Refresh Rate: " + delayInMilliseconds + "ms";
function init() {
    var source;
    // create new AudioContext
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var analyser = audioContext.createAnalyser();
    
    // detect the compatibility
    if (!navigator?.mediaDevices?.getUserMedia) {
        alert('Sorry, newer version of browser is required for the app.')
        return;
    } else {
        var constraints = { audio: true };
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                // Main process
                source = audioContext.createMediaStreamSource(stream); // make stream source
                source.connect(analyser); // connect
                detectPitch(); 
            })
            .catch(function (err) {
                alert('Sorry, microphone permissions are required for the app. Feel free to read on without playing :)')
            });
    }

    function detectPitch() {
        var bufferLength = analyser.fftSize;
        var buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);
        var detectedFrequency = autoCorrelate(buffer, audioContext.sampleRate);
        if (detectedFrequency > 5000) {
          console.log("Detected Frequency: " + detectedFrequency);
        }
        var detectedNote = noteStrings[noteFromPitch(detectedFrequency) % 12];
    
        // var roundingValue = document.querySelector('input[name="rounding"]:checked').value;
        // if (roundingValue == 'hz') {
        //     detectedFrequency = Math.round(detectedFrequency) + ' Hz';
        // } else {
        //     detectedFrequency = detectedFrequency.toFixed(2) + ' Hz'; // You can adjust the precision as needed
        // }
    
        // var displayText = detectedNote + " (" + detectedFrequency + ")";
        detectedFrequency += ' Hz';
        document.getElementById('note1').innerText = detectedNote;
        document.getElementById('note2').innerText = detectedFrequency;
        setTimeout(() => {
            requestAnimationFrame(detectPitch);
        }, delayInMilliseconds);
    }
    
    // function detectPitch() {
    //     var bufferLength = analyser.fftSize;
    //     var buffer = new Float32Array(bufferLength);
    //     analyser.getFloatTimeDomainData(buffer);
    //     var detectedPitch = autoCorrelate(buffer, audioContext.sampleRate);

    //     var roundingValue = document.querySelector('input[name="rounding"]:checked').value;
    //     if (roundingValue == 'hz') {
    //         detectedPitch = Math.round(detectedPitch);
    //     } else {
    //         detectedPitch = noteStrings[noteFromPitch(detectedPitch) % 12];
    //     }

    //     if (typeof(detectedPitch) == 'number') {
    //         detectedPitch += ' Hz';
    //       }
    //     document.getElementById('note').innerText = detectedPitch;

        
    //         setTimeout(() => {
    //             requestAnimationFrame(detectPitch);
    //         }, delayInMilliseconds);
        
        
    //     // requestAnimationFrame(detectPitch);
    // }
}

function autoCorrelate(buffer, sampleRate) {
  // Perform a quick root-mean-square to see if we have enough signal
  var SIZE = buffer.length;
  var sumOfSquares = 0;
  for (var i = 0; i < SIZE; i++) {
    var val = buffer[i];
    sumOfSquares += val * val;
  }
  var rootMeanSquare = Math.sqrt(sumOfSquares / SIZE)
  if (rootMeanSquare < 0.01) {
    return -1;
  }

  // Find a range in the buffer where the values are below a given threshold.
  var r1 = 0;
  var r2 = SIZE - 1;
  var threshold = 0.2;

  // Walk up for r1
  for (var i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  // Walk down for r2
  for (var i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  // Trim the buffer to these ranges and update SIZE.
  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length

  // Create a new array of the sums of offsets to do the autocorrelation
  var c = new Array(SIZE).fill(0);
  // For each potential offset, calculate the sum of each buffer value times its offset value
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j+i]
    }
  }

  // Find the last index where that value is greater than the next one (the dip)
  var d = 0;
  while (c[d] > c[d+1]) {
    d++;
  }

  // Iterate from that index through the end and find the maximum sum
  var maxValue = -1;
  var maxIndex = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxValue) {
      maxValue = c[i];
      maxIndex = i;
    }
  }

  var T0 = maxIndex;

  // Not as sure about this part, don't @ me
  // From the original author:
  // interpolation is parabolic interpolation. It helps with precision. We suppose that a parabola pass through the
  // three points that comprise the peak. 'a' and 'b' are the unknowns from the linear equation system and b/(2a) is
  // the "error" in the abscissa. Well x1,x2,x3 should be y1,y2,y3 because they are the ordinates.
  var x1 = c[T0 - 1];
  var x2 = c[T0];
  var x3 = c[T0 + 1]

  var a = (x1 + x3 - 2 * x2) / 2;
  var b = (x3 - x1) / 2
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  return sampleRate/T0;
}


function noteFromPitch( frequency ) {
      var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
      return Math.round( noteNum ) + 69;
    }


var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
