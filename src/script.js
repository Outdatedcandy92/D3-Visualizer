document.getElementById('audioFileInput').addEventListener('change', function(event) {
    const audio = document.getElementById('audio');
    const file = event.target.files[0];
    const url = URL.createObjectURL(file);
    audio.src = url;
    updateVisualizer(audio);
});

document.getElementById('visualizerType').addEventListener('change', function() {
    const audio = document.getElementById('audio');
    updateVisualizer(audio);
});

function updateVisualizer(audio) {
    const visualizerType = document.getElementById('visualizerType').value;
    d3.select('#visualization').selectAll('*').remove(); 
    switch (visualizerType) {
        case 'circle':
            visualizeAudioWithCircle(audio);
            break;
        case 'spikes':
            visualizeAudioWithSpikes(audio);
            break;
        case 'bars':
            visualizeAudio(audio);
            break;
        case 'lines':
            visualizeAudioWithLines(audio);
            break;
        default:
            visualizeAudio(audio);
            break;
    }
}



function visualizeAudioWithCircle(audio) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();

    src.connect(analyser);
    analyser.connect(context.destination);

    analyser.fftSize = 1024;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const svgWidth = window.innerWidth;
    const svgHeight = window.innerHeight;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        

        
    
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const maxRadius = Math.min(svgWidth, svgHeight) / 4;
    const minRadius = maxRadius / 12; 
    
    const colorScale = d3.scaleLinear()
        .domain([0, 255])
        .range(['green', 'red']);
    
    const path = svg.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#39d353')
        .attr('stroke-width', 2);
    
    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);
    
        const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const radius = minRadius + (avgFrequency / 255) * (maxRadius - minRadius);
    
        const activeData = dataArray.filter(value => value > 0);
        const angleStep = (2 * Math.PI) / activeData.length;
    

        const customOrder = [];
        let mid = Math.floor(activeData.length / 2);
        customOrder.push(0); 
        for (let i = 1; i < activeData.length; i++) {
            if (i % 2 === 1) {
                customOrder.push(Math.floor(i / 2) + 1); 
            } else {
                customOrder.push(mid - Math.floor(i / 2)); 
            }
        }
    
        let pathData = '';
        customOrder.forEach((index, i) => {
            const d = activeData[index];
            const angle = i * angleStep - Math.PI / 2; 
            let spikeRadius = radius + (d / 255) * maxRadius / 1;
            spikeRadius = Math.min(spikeRadius, maxRadius * 1.5);
            const x = centerX + spikeRadius * Math.cos(angle);
            const y = centerY + spikeRadius * Math.sin(angle);
            pathData += (i === 0 ? 'M' : 'L') + x + ',' + y;
        });
        pathData += 'Z'; 
    
        path.attr('d', pathData)
            .attr('stroke', colorScale(avgFrequency));
    }
    
    audio.play();
    renderFrame();
}




function visualizeAudioWithSpikes(audio) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();

    src.connect(analyser);
    analyser.connect(context.destination);

    analyser.fftSize = 256; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const svgWidth = window.innerWidth;
    const svgHeight = window.innerHeight;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const maxRadius = Math.min(svgWidth, svgHeight) / 4;
    const minRadius = maxRadius / 2; 

    const circle = svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', maxRadius)
        .attr('fill', 'none')
        .attr('stroke', '#39d353')
        .attr('stroke-width', 2);

    const colorScale = d3.scaleLinear()
        .domain([50, 100, 200])
        .range(['green','blue', 'red']);

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

        const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const radius = minRadius + (avgFrequency / 255) * (maxRadius - minRadius);

        circle.attr('r', radius)
              .attr('stroke', colorScale(avgFrequency)); 

        const activeData = dataArray.filter(value => value > 0);
        const angleStep = (2 * Math.PI) / activeData.length;
        const strokeWidth = Math.max(5, 10 / activeData.length); 

        const spikes = svg.selectAll('line')
            .data(activeData);

        spikes.enter()
            .append('line')
            .attr('stroke-width', strokeWidth)
            .merge(spikes)
            .attr('stroke', d => colorScale(d)) 
            .attr('x1', (d, i) => centerX + radius * Math.cos(i * angleStep))
            .attr('y1', (d, i) => centerY + radius * Math.sin(i * angleStep))
            .attr('x2', (d, i) => centerX + (radius + (d / 255) * maxRadius / 2) * Math.cos(i * angleStep))
            .attr('y2', (d, i) => centerY + (radius + (d / 255) * maxRadius / 2) * Math.sin(i * angleStep))
            .attr('stroke-width', strokeWidth);

        spikes.exit().remove();
    }

    audio.play();
    renderFrame();
}


function visualizeAudio(audio) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();

    src.connect(analyser);
    analyser.connect(context.destination);

    const NUM_BARS = 164;
    const MAX_BAR_HEIGHT = 500;
    const SENSITIVITY = 256;

    analyser.fftSize = SENSITIVITY;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const svgWidth = window.innerWidth - margin.left - margin.right;
    const svgHeight = window.innerHeight - margin.top - margin.bottom;
    const barWidth = (svgWidth / NUM_BARS) * 1.5;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', svgWidth + margin.left + margin.right)
        .attr('height', svgHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

        const totalBarWidth = NUM_BARS * barWidth;
        const offsetX = (svgWidth - totalBarWidth) / 2;

        svg.selectAll('rect')
            .data(dataArray.slice(0, NUM_BARS))
            .join('rect')
            .attr('x', (d, i) => offsetX + i * barWidth)
            .attr('y', d => svgHeight - (d / 255) * MAX_BAR_HEIGHT)
            .attr('width', barWidth - 1)
            .attr('height', d => (d / 255) * MAX_BAR_HEIGHT)
            .attr('fill', '#39d353');
    }

    audio.play();
    renderFrame();
}

function visualizeAudioWithLines(audio) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();

    src.connect(analyser);
    analyser.connect(context.destination);

    const SENSITIVITY = 512;

    analyser.fftSize = SENSITIVITY;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const svgWidth = window.innerWidth - margin.left - margin.right;
    const svgHeight = 500;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', svgWidth + margin.left + margin.right)
        .attr('height', svgHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const THRESHOLD = 10;
    const SMOOTHING_FACTOR = 0.9;

    let smoothedData = new Uint8Array(bufferLength);

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

  
        for (let i = 0; i < bufferLength; i++) {
            smoothedData[i] = smoothedData[i] * SMOOTHING_FACTOR + dataArray[i] * (1 - SMOOTHING_FACTOR);
        }

        const filteredData = smoothedData.filter(value => value > THRESHOLD);

        const segmentWidth = svgWidth / filteredData.length;
        const offsetX = (svgWidth - (segmentWidth * filteredData.length)) / 2;

        const line = d3.line()
            .curve(d3.curveBasis)
            .x((d, i) => offsetX + i * segmentWidth)
            .y(d => svgHeight - (d / 255) * svgHeight);

        svg.selectAll('path')
            .data([filteredData])
            .join('path')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#39d353')
            .attr('stroke-width', 2);
    }

    audio.play();
    renderFrame();
}

