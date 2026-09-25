import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react';

import {
  Check,
  ImagePlus,
  MousePointer2,
  Pentagon,
  Plus,
  RectangleHorizontal,
  Trash2,
  X,
} from 'lucide-react';

import type {
  AnatomyImage,
  AnatomyRegion,
  Point,
  RegionType,
  Slide,
} from '../types/anatomy';

import { clientToNaturalPoint } from '../utils/imageCoordinates';
import { useDialog } from './DialogProvider';
import { useToast } from './ToastProvider';

interface Props {
  slide: Slide;
  onUpdate: (updater: (slide: Slide) => Slide) => void;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

function scaleRegion(
  region: AnatomyRegion,
  scaleX: number,
  scaleY: number
): AnatomyRegion {
  if (region.type === 'polygon' && region.points) {
    return {
      ...region,
      points: region.points.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })),
    };
  }

  return {
    ...region,
    x:
      region.x === undefined
        ? undefined
        : region.x * scaleX,
    y:
      region.y === undefined
        ? undefined
        : region.y * scaleY,
    width:
      region.width === undefined
        ? undefined
        : region.width * scaleX,
    height:
      region.height === undefined
        ? undefined
        : region.height * scaleY,
  };
}

interface RegionCanvasProps {
  image: AnatomyImage;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (
    updater: (image: AnatomyImage) => AnatomyImage
  ) => void;
}

function RegionCanvas({
  image,
  selectedId,
  onSelect,
  onUpdate,
}: RegionCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [tool, setTool] = useState<RegionType | null>(
    null
  );

  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const [polygon, setPolygon] = useState<Point[]>([]);

  const pointFromEvent = (
    event: PointerEvent<SVGSVGElement>
  ): Point => {
    const rect =
      svgRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return clientToNaturalPoint(
      event.clientX,
      event.clientY,
      rect,
      image.width,
      image.height
    );
  };

  const cancelDrawing = () => {
    setTool(null);
    setStart(null);
    setCurrent(null);
    setPolygon([]);
  };

  const addRegion = (region: AnatomyRegion) => {
    onUpdate((currentImage) => ({
      ...currentImage,
      regions: [...currentImage.regions, region],
    }));

    onSelect(region.id);
    cancelDrawing();
  };

  const finishPolygon = () => {
    if (polygon.length < 3) {
      return;
    }

    addRegion({
      id: createId('region'),
      name: `Yeni Bölge ${image.regions.length + 1}`,
      type: 'polygon',
      points: polygon,
    });
  };

  const pointerDown = (
    event: PointerEvent<SVGSVGElement>
  ) => {
    if (!tool) {
      onSelect(null);
      return;
    }

    const point = pointFromEvent(event);

    if (tool === 'rectangle') {
      setStart(point);
      setCurrent(point);
      return;
    }

    if (tool === 'polygon') {
      setPolygon((points) => [...points, point]);
    }
  };

  const pointerMove = (
    event: PointerEvent<SVGSVGElement>
  ) => {
    if (tool !== 'rectangle' || !start) {
      return;
    }

    setCurrent(pointFromEvent(event));
  };

  const pointerUp = (
    event: PointerEvent<SVGSVGElement>
  ) => {
    if (tool !== 'rectangle' || !start) {
      return;
    }

    const end = pointFromEvent(event);

    const region: AnatomyRegion = {
      id: createId('region'),
      name: `Yeni Bölge ${image.regions.length + 1}`,
      type: 'rectangle',
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };

    if (
      (region.width ?? 0) >
        image.width * 0.01 &&
      (region.height ?? 0) >
        image.height * 0.01
    ) {
      addRegion(region);
    } else {
      cancelDrawing();
    }
  };

  const preview =
    start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(
            current.x - start.x
          ),
          height: Math.abs(
            current.y - start.y
          ),
        }
      : null;

  const selectRectangleTool = () => {
    if (tool === 'rectangle') {
      cancelDrawing();
      return;
    }

    setStart(null);
    setCurrent(null);
    setPolygon([]);
    setTool('rectangle');
  };

  const selectPolygonTool = () => {
    if (tool === 'polygon') {
      cancelDrawing();
      return;
    }

    setStart(null);
    setCurrent(null);
    setPolygon([]);
    setTool('polygon');
  };

  return (
    <div className="region-canvas-column">
      <div className="region-workspace-toolbar">
        <div className="region-tool-group">
          <button
            type="button"
            className={`region-tool ${
              tool === null ? 'active' : ''
            }`}
            onClick={cancelDrawing}
          >
            <MousePointer2 size={15} />
            Seç
          </button>

          <button
            type="button"
            className={`region-tool ${
              tool === 'rectangle'
                ? 'active'
                : ''
            }`}
            onClick={selectRectangleTool}
          >
            <RectangleHorizontal size={15} />
            Dikdörtgen
          </button>

          <button
            type="button"
            className={`region-tool ${
              tool === 'polygon'
                ? 'active'
                : ''
            }`}
            onClick={selectPolygonTool}
          >
            <Pentagon size={15} />
            Çokgen
          </button>
        </div>

        {tool === 'polygon' ? (
          <div className="region-drawing-actions">
            <span className="polygon-point-count">
              {polygon.length} nokta
            </span>

            <button
              type="button"
              className="region-finish-button"
              disabled={polygon.length < 3}
              onClick={finishPolygon}
            >
              <Check size={14} />
              Tamamla
            </button>

            <button
              type="button"
              className="region-cancel-button"
              onClick={cancelDrawing}
              aria-label="Çizimi iptal et"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="region-tool-hint">
            {tool === 'rectangle'
              ? 'Görsel üzerinde sürükleyerek alan seç.'
              : 'Bir bölgeyi seçmek veya düzenlemek için tıkla.'}
          </span>
        )}
      </div>

      <div
        className={`natural-image-stage region-stage ${
          tool ? 'is-drawing' : ''
        }`}
        style={{
          aspectRatio: `${image.width} / ${image.height}`,
        }}
      >
        <img
          src={image.src}
          alt={image.name}
          draggable={false}
          onLoad={(event) => {
            const element = event.currentTarget;

            if (
              element.naturalWidth !== image.width ||
              element.naturalHeight !== image.height
            ) {
              const scaleX =
                element.naturalWidth /
                image.width;

              const scaleY =
                element.naturalHeight /
                image.height;

              onUpdate((currentImage) => ({
                ...currentImage,
                width: element.naturalWidth,
                height: element.naturalHeight,
                regions:
                  currentImage.regions.map(
                    (region) =>
                      scaleRegion(
                        region,
                        scaleX,
                        scaleY
                      )
                  ),
              }));
            }
          }}
        />

        <svg
          ref={svgRef}
          className={`natural-region-overlay ${
            tool ? 'drawing' : ''
          }`}
          viewBox={`0 0 ${image.width} ${image.height}`}
          preserveAspectRatio="none"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
        >
          {image.regions.map((region) => {
            if (
              region.type === 'rectangle' &&
              region.x !== undefined &&
              region.y !== undefined &&
              region.width !== undefined &&
              region.height !== undefined
            ) {
              return (
                <rect
                  key={region.id}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  className={`region-shape ${
                    selectedId === region.id
                      ? 'selected'
                      : ''
                  }`}
                  onPointerDown={(event) => {
                    if (tool) return;

                    event.stopPropagation();
                    onSelect(region.id);
                  }}
                />
              );
            }

            if (
              region.type === 'polygon' &&
              region.points
            ) {
              return (
                <polygon
                  key={region.id}
                  points={region.points
                    .map(
                      (point) =>
                        `${point.x},${point.y}`
                    )
                    .join(' ')}
                  className={`region-shape ${
                    selectedId === region.id
                      ? 'selected'
                      : ''
                  }`}
                  onPointerDown={(event) => {
                    if (tool) return;

                    event.stopPropagation();
                    onSelect(region.id);
                  }}
                />
              );
            }

            return null;
          })}

          {preview && (
            <rect
              {...preview}
              className="region-preview"
            />
          )}

          {polygon.length > 0 && (
            <>
              <polyline
                points={polygon
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(' ')}
                className="region-preview-line"
              />

              {polygon.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={Math.max(
                    4,
                    Math.min(
                      image.width,
                      image.height
                    ) * 0.008
                  )}
                  className="region-polygon-point"
                />
              ))}
            </>
          )}
        </svg>

        {!tool && image.regions.length === 0 && (
          <div className="region-stage-empty">
            <div className="region-stage-empty-icon">
              <ShapesIcon />
            </div>

            <strong>
              İlk bölgeni oluştur
            </strong>

            <span>
              Yukarıdaki araçlardan birini seçerek
              görsel üzerinde alan çiz.
            </span>
          </div>
        )}

        {tool && (
          <div className="region-stage-mode">
            {tool === 'rectangle'
              ? 'Dikdörtgen çizim modu'
              : 'Çokgen çizim modu'}
          </div>
        )}
      </div>

      <div className="region-canvas-footer">
        <span>
          <strong>{image.regions.length}</strong>{' '}
          bölge tanımlı
        </span>

        <span>
          {image.width} × {image.height} px
        </span>
      </div>
    </div>
  );
}

function ShapesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <circle cx="16.5" cy="7.5" r="4.5" />
      <path d="M5 15h7l3 6H3z" />
    </svg>
  );
}

export default function RegionEditor({
  slide,
  onUpdate,
}: Props) {
  const { showConfirm } = useDialog();
  const { showToast } = useToast();

  const [selectedImageId, setSelectedImageId] =
    useState<string | null>(
      slide.images[0]?.id ?? null
    );

  const [selectedRegionId, setSelectedRegionId] =
    useState<string | null>(
      slide.images[0]?.regions[0]?.id ?? null
    );

  const image =
    slide.images.find(
      (item) => item.id === selectedImageId
    ) ?? null;

  useEffect(() => {
    if (!slide.images.length) {
      setSelectedImageId(null);
      setSelectedRegionId(null);
      return;
    }

    const selectedImageStillExists =
      slide.images.some(
        (item) => item.id === selectedImageId
      );

    if (!selectedImageStillExists) {
      const firstImage = slide.images[0];

      setSelectedImageId(firstImage.id);
      setSelectedRegionId(
        firstImage.regions[0]?.id ?? null
      );
    }
  }, [slide.images, selectedImageId]);

  useEffect(() => {
    if (!image) {
      setSelectedRegionId(null);
      return;
    }

    const regionStillExists =
      image.regions.some(
        (region) =>
          region.id === selectedRegionId
      );

    if (!regionStillExists) {
      setSelectedRegionId(
        image.regions[0]?.id ?? null
      );
    }
  }, [image, selectedRegionId]);

  const updateImage = (
    imageId: string,
    updater: (
      image: AnatomyImage
    ) => AnatomyImage
  ) => {
    onUpdate((currentSlide) => ({
      ...currentSlide,
      images: currentSlide.images.map(
        (item) =>
          item.id === imageId
            ? updater(item)
            : item
      ),
    }));
  };

  const addImage = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result !== 'string'
      ) {
        return;
      }

      const loaded = new Image();

      loaded.onload = () => {
        const next: AnatomyImage = {
          id: createId('image'),
          src: reader.result as string,
          name:
            file.name.replace(
                /\.[^.]+$/,
                ''
            ) ||
            `Görsel ${slide.images.length + 1}`,
          width: loaded.naturalWidth,
          height: loaded.naturalHeight,
          regions: [],
        };

        onUpdate((currentSlide) => ({
          ...currentSlide,
          images: [
            ...currentSlide.images,
            next,
          ],
        }));

        setSelectedImageId(next.id);
        setSelectedRegionId(null);

        showToast(
          'Görsel eklendi.',
          'success'
        );
      };

      loaded.src = reader.result;
    };

    reader.readAsDataURL(file);

    event.target.value = '';
  };

  const deleteImage = async (
    target: AnatomyImage
  ) => {
    const confirmed =
      await showConfirm(
        `"${target.name}" ve bu görsele bağlı bölgeler ve bölge soruları silinsin mi?`,
        {
          title: 'Görseli sil',
          tone: 'danger',
          confirmLabel: 'Sil',
        }
      );

    if (!confirmed) return;

    const remaining =
      slide.images.filter(
        (item) => item.id !== target.id
      );

    onUpdate((currentSlide) => ({
      ...currentSlide,
      images: remaining,
      questions:
        currentSlide.questions.filter(
          (question) =>
            question.type !== 'region' ||
            question.imageId !== target.id
        ),
    }));

    setSelectedImageId(
      remaining[0]?.id ?? null
    );

    setSelectedRegionId(
      remaining[0]?.regions[0]?.id ?? null
    );

    showToast(
      'Görsel silindi.',
      'success'
    );
  };

  const deleteRegion = async (
    region: AnatomyRegion
  ) => {
    if (!image) return;

    const confirmed =
      await showConfirm(
        `"${region.name}" bölgesi silinsin mi?`,
        {
          title: 'Bölgeyi sil',
          tone: 'danger',
          confirmLabel: 'Sil',
        }
      );

    if (!confirmed) return;

    updateImage(
      image.id,
      (currentImage) => ({
        ...currentImage,
        regions:
          currentImage.regions.filter(
            (item) =>
              item.id !== region.id
          ),
      })
    );

    setSelectedRegionId(null);

    showToast(
      'Bölge silindi.',
      'success'
    );
  };
  
  return (
    <div className="multi-image-region-editor">
      <div className="region-editor-layout">
        {/* IMAGE SIDEBAR */}
        <aside className="region-image-sidebar">
          <div className="region-sidebar-heading">
            <div>
              <span className="editor-section-kicker">
                GÖRSELLER
              </span>

              <h3>Çalışma görselleri</h3>
            </div>

            <span className="region-image-count">
              {slide.images.length}
            </span>
          </div>

          <label className="region-upload-button">
            <input
              type="file"
              accept="image/*"
              onChange={addImage}
            />

            <ImagePlus size={16} />
            <span>Görsel ekle</span>
          </label>

          <div className="region-image-list">
            {slide.images.map((item, index) => {
              const active =
                item.id === selectedImageId;

              return (
                <article
                  className={`region-image-item ${
                    active ? 'active' : ''
                  }`}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="region-image-select"
                    onClick={() => {
                      setSelectedImageId(
                        item.id
                      );

                      setSelectedRegionId(
                        item.regions[0]?.id ??
                          null
                      );
                    }}
                  >
                    <span className="region-image-number">
                      {String(index + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span className="region-image-thumb">
                      <img
                        src={item.src}
                        alt=""
                      />
                    </span>

                    <span className="region-image-info">
                      <strong>
                        {item.name ||
                          `Görsel ${index + 1}`}
                      </strong>

                      <small>
                        {item.regions.length}{' '}
                        bölge
                      </small>
                    </span>
                  </button>

                  <div className="region-image-edit">
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateImage(
                          item.id,
                          (currentImage) => ({
                            ...currentImage,
                            name:
                              event.target
                                .value,
                          })
                        )
                      }
                      aria-label={`${item.name} görsel adını düzenle`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        deleteImage(item)
                      }
                      aria-label={`${item.name} görselini sil`}
                      title="Görseli sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {slide.images.length === 0 && (
            <div className="region-sidebar-empty">
              <ImagePlus size={20} />

              <strong>
                Görsel ekle
              </strong>

              <span>
                Anatomi görselini buradan
                yükleyebilirsin.
              </span>
            </div>
          )}
        </aside>

        {/* WORKSPACE */}
        {image ? (
          <div className="selected-image-workspace">
            <div className="region-workspace-header">
              <div>
                <span className="editor-section-kicker">
                  ÇALIŞMA ALANI
                </span>

                <h3>
                  {image.name ||
                    'Adsız görsel'}
                </h3>
              </div>

              <div className="region-workspace-meta">
                <span>
                  {image.width} ×{' '}
                  {image.height} px
                </span>

                <span>
                  {image.regions.length}{' '}
                  bölge
                </span>
              </div>
            </div>

            <RegionCanvas
              image={image}
              selectedId={
                selectedRegionId
              }
              onSelect={
                setSelectedRegionId
              }
              onUpdate={(updater) =>
                updateImage(
                  image.id,
                  updater
                )
              }
            />

            <div className="region-list-panel">
              <div className="region-list-header">
                <div>
                  <span className="editor-section-kicker">
                    BÖLGE LİSTESİ
                  </span>

                  <h3>
                    Tanımlanan bölgeler
                  </h3>
                </div>

                <span>
                  {image.regions.length}
                </span>
              </div>

              {image.regions.length ===
              0 ? (
                <div className="region-list-empty">
                  <MousePointer2
                    size={18}
                  />

                  <span>
                    Henüz bölge
                    oluşturulmadı.
                  </span>
                </div>
              ) : (
                <div className="region-name-list">
                  {image.regions.map(
                    (region, index) => {
                      const active =
                        region.id ===
                        selectedRegionId;

                      return (
                        <div
                          className={`region-list-item ${
                            active
                              ? 'active'
                              : ''
                          }`}
                          key={region.id}
                        >
                          <button
                            type="button"
                            className="region-select-button"
                            onClick={() =>
                              setSelectedRegionId(
                                region.id
                              )
                            }
                          >
                            <span>
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                '0'
                              )}
                            </span>

                            <strong>
                              {region.name ||
                                'Adsız bölge'}
                            </strong>

                            <small>
                              {region.type ===
                              'polygon'
                                ? 'Çokgen'
                                : 'Dikdörtgen'}
                            </small>
                          </button>

                          <div className="region-name-editor">
                            <input
                              value={
                                region.name
                              }
                              onChange={(
                                event
                              ) =>
                                updateImage(
                                  image.id,
                                  (
                                    currentImage
                                  ) => ({
                                    ...currentImage,
                                    regions:
                                      currentImage.regions.map(
                                        (item) =>
                                          item.id ===
                                          region.id
                                            ? {
                                                ...item,
                                                name:
                                                  event
                                                    .target
                                                    .value,
                                              }
                                            : item
                                      ),
                                  })
                                )
                              }
                              aria-label={`${region.name} bölge adını düzenle`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                deleteRegion(
                                  region
                                )
                              }
                              aria-label={`${region.name} bölgesini sil`}
                              title="Bölgeyi sil"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="editor-empty region-no-image">
            <div className="editor-empty-icon">
              <ImagePlus size={25} />
            </div>

            <span className="editor-empty-kicker">
              GÖRSEL GEREKLİ
            </span>

            <h2>
              Çalışmaya başlamak için
              görsel ekle
            </h2>

            <p>
              Slaytına bir görsel
              yükleyerek üzerinde
              tıklanabilir bölgeler
              oluşturabilirsin.
            </p>

            <label className="primary-button region-empty-upload">
              <input
                type="file"
                accept="image/*"
                onChange={addImage}
              />

              <Plus size={16} />
              Görsel Ekle
            </label>
          </div>
        )}
      </div>
    </div>
  );
}