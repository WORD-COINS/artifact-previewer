import "./style.css";
import { downloadFile, fetchDownloadUrl } from "./lib/fetch";

const main = async () => {
    const workerUrl =
        import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
    const url = new URL(window.location.search, workerUrl).toString();

    const result = await fetchDownloadUrl(url);
    if (!result.ok) {
        return result.message;
    }

    const progressBar = document.getElementById("progress");
    const status = document.getElementById("result");

    const downloadUrl = result.value;
    const result1 = await downloadFile(downloadUrl, (progress) => {
        if (progress < 0) {
            return;
        }

        if (progressBar) {
            progressBar.setAttribute("value", String(progress));
            progressBar.innerText = `${Math.floor(progress * 100)}%`;
        }
        if (status) {
            status.innerText = `ファイルをダウンロードしています……: ${Math.floor(progress * 100)}%`;
        }
    });

    if (!result1.ok) {
        return result1.message;
    }

    const buf = await result1.value.arrayBuffer();
    const view = new DataView(buf);

    // end of central directory record(EOCD)を探す
    let eocdOffset = -1;
    for (let i = buf.byteLength - 1 - 4; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) {
        return "zipファイルの解析に失敗しました（End of central directory recordが見つかりません）";
    }

    // EOCDの中身を取得
    const eocd = {
        diskNumber: view.getUint16(eocdOffset + 4, true),
        centralDirDiskNumber: view.getUint16(eocdOffset + 6, true),
        totalEntriesOnDisk: view.getUint16(eocdOffset + 8, true),
        totalEntries: view.getUint16(eocdOffset + 10, true),
        centralDirSize: view.getUint32(eocdOffset + 12, true),
        centralDirOffset: view.getUint32(eocdOffset + 16, true),
        commentLength: view.getUint16(eocdOffset + 20, true),
    };

    // central direcoryの中身を取得
    const offset = eocd.centralDirOffset;
    const metadata = {
        versionMadeBy: view.getUint16(offset + 4, true),
        versionNeeded: view.getUint16(offset + 6, true),
        generalPurposeBitFlag: view.getUint16(offset + 8, true),
        compressionMethod: view.getUint16(offset + 10, true),
        lastModFileTime: view.getUint16(offset + 12, true),
        lastModFileDate: view.getUint16(offset + 14, true),
        crc32: view.getUint32(offset + 16, true),
        compressedSize: view.getUint32(offset + 20, true),
        uncompressedSize: view.getUint32(offset + 24, true),
        fileNameLength: view.getUint16(offset + 28, true),
        extraFieldLength: view.getUint16(offset + 30, true),
        fileCommentLength: view.getUint16(offset + 32, true),
        diskNumberStart: view.getUint16(offset + 34, true),
        internalFileAttributes: view.getUint16(offset + 36, true),
        externalFileAttributes: view.getUint32(offset + 38, true),
        relativeLocalHeaderOffset: view.getUint32(offset + 42, true),
    };

    const fileNameBinary = new Uint8Array(
        buf,
        offset + 46,
        metadata.fileNameLength,
    );
    const fileName = new TextDecoder().decode(fileNameBinary);
    console.log("File Name:", fileName);

    // local file headerを探す
    let headerOffset = -1;
    for (let i = 0; i < offset; i++) {
        if (view.getUint32(i, true) === 0x04034b50) {
            headerOffset = i;
            break;
        }
    }
    if (headerOffset === -1) {
        return "zipファイルの解析に失敗しました（Local file headerが見つかりません）";
    }

    // ファイルを取得
    const fileDataOffset =
        headerOffset + 30 + metadata.fileNameLength + metadata.extraFieldLength;
    const fileData = new Uint8Array(
        buf,
        fileDataOffset,
        metadata.compressedSize,
    );

    console.log("Compression Method: ", metadata.compressionMethod);
    let decompressedFile: BlobPart;
    switch (metadata.compressionMethod) {
        case 0:
            // 圧縮されていないときはそのまま
            decompressedFile = fileData;
            break;
        case 8:
            // deflate圧縮されている場合はDecompressionStreamで解凍
            const zipBlob = new Blob([fileData]);
            const stream: ReadableStream<Uint8Array> = zipBlob.stream();
            const compressedStream = stream.pipeThrough(
                new DecompressionStream("deflate-raw"),
            );

            const res = new Response(compressedStream);
            decompressedFile = await res.blob();

            break;
        default:
            return `サポートされていない圧縮方式です: ${metadata.compressionMethod}`;
    }

    // blobに変換して遷移
    const blob = new Blob([decompressedFile], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    window.location.href = blobUrl;
};

(async () => {
    const elm = document.getElementById("result");
    if (elm) {
        elm.innerText = "処理中です……";
    }

    const error = await main();

    if (error) {
        if (elm) {
            elm.innerText = error;
        } else {
            console.error(error);
        }
    }
})();
