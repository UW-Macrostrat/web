# pylint: disable=imports,too-many-arguments,too-many-branches,too-many-locals
"""
Ingest map data from archive files.

A.k.a., a pipeline for ingesting maps into Macrostrat.
"""

import csv
import datetime
import hashlib
import importlib
import os
import pathlib
import re
import shutil
import tarfile
import tempfile
import time
import zipfile
from contextlib import contextmanager
from typing import Annotated, Any, NoReturn, Optional

import requests  # type: ignore[import-untyped]
from rich.console import Console
from sqlalchemy import and_, insert, select, update
from sqlalchemy.orm import Session
from typer import Argument, Option

from macrostrat.core.database import get_database
from macrostrat.core.schemas import (  # type: ignore[import-untyped]
    IngestProcess,
    IngestProcessTag,
    IngestState,
    Object,
    ObjectGroup,
    SchemeEnum,
    Sources,
)
from macrostrat.map_integration import config
from macrostrat.map_integration.commands.ingest import ingest_map
from macrostrat.map_integration.commands.prepare_fields import prepare_fields
from macrostrat.map_integration.errors import IngestError
from macrostrat.map_integration.process.geometry import create_rgeom, create_webgeom
from macrostrat.map_integration.utils.map_info import MapInfo, get_map_info

from .config import get_minio_client

# Do this with importlib so we control the order
for mod in ["pylibmagic", "magic"]:
    importlib.import_module("magic")

# The list of arguments to upload_file that ingest_csv will look
# for in the CSV file given to it.
FIELDS = [
    "slug",
    "name",
    # "tag",  # use the CLI, which supports applying multiple tags
    "ref_title",
    "ref_authors",
    "ref_year",
    "ref_source",
    "ref_isbn_or_doi",
    "scale",
    "archive_url",
    "website_url",
    "raster_url",
]

# The current terminal, with support for displaying rich text.
console = Console()


# --------------------------------------------------------------------------
# Assorted helper functions.

default_s3_bucket = config.S3_BUCKET


def normalize_slug(slug: str) -> str:
    """
    Replace characters that are invalid in an sql table name with an underscore.
    """
    return re.sub(r"\W", "_", slug).lower()


def strify_list(xs: list[Any]) -> list[str]:
    """
    Convert the provided list to a list of strings.
    """
    return [str(x) for x in xs]


def truncate_str(data: str, *, limit: int = 255) -> str:
    """
    Replace the end of a string with "..." if its length exceeds some limit.
    """
    if len(data) > limit:
        data = data[: limit - 3] + "..."
    return data[:limit]


def truncate_source_metadata(data: dict[str, Any]) -> dict[str, Any]:
    """
    Ensure that metadata fields for a `maps.sources` record are not too long.
    """
    data = data.copy()
    for col in ["name", "url", "authors", "ref_source"]:
        if col in data:
            data[col] = truncate_str(data[col], limit=255)
    for col in ["isbn_doi", "licence"]:
        if col in data:
            data[col] = truncate_str(data[col], limit=100)
    return data


def raise_ingest_error(
    ingest_process: IngestProcess, comments: str, source_exn: Optional[Exception] = None
) -> NoReturn:
    """
    Set an ingest process to "failed", and then raise an Exception.
    """
    record_ingest_error(ingest_process, comments)
    raise IngestError(comments) from source_exn


def record_ingest_error(ingest_process: IngestProcess, comments: str) -> None:
    """
    Set an ingest process to "failed".
    """
    update_ingest_process(
        ingest_process.id, state=IngestState.failed, comments=comments
    )


# --------------------------------------------------------------------------
# Extracting and analyzing archive files.


def is_archive(file: pathlib.Path) -> bool:
    """
    Return whether a file appears to be an archive, based on its name.
    """
    return file.name.endswith((".tgz", ".tar.gz", ".zip"))


def extract_archive(
    archive_file: pathlib.Path,
    target_dir: pathlib.Path,
    *,
    ingest_process: Optional[IngestProcess] = None,
    extract_subarchives: bool = True,
) -> None:
    """
    Extract an archive file into a directory.

    By default, any extracted files that are themselves archives will be
    expanded into the same directory. This might not result in the expected
    layout for some archives.

    If provided, the ingest process will be used to report any errors.
    """
    if archive_file.name.endswith((".tgz", ".tar.gz")):
        with tarfile.open(archive_file) as tf:
            tf.extractall(path=target_dir, filter="data")
    elif archive_file.name.endswith(".zip"):
        with zipfile.ZipFile(archive_file) as zf:
            zf.extractall(path=target_dir)
    elif ingest_process:
        raise_ingest_error(ingest_process, "Unrecognized archive file format")
    else:
        raise IngestError("Unrecognized archive file format")

    if extract_subarchives:
        sub_archives = set(target_dir.glob("**/*.tgz"))
        sub_archives |= set(target_dir.glob("**/*.tar.gz"))
        sub_archives |= set(target_dir.glob("**/*.zip"))

        for sub_archive in sub_archives - {archive_file}:
            extract_archive(
                sub_archive,
                target_dir,
                ingest_process=ingest_process,
                extract_subarchives=False,
            )


def update_alaska_metadata(source: Sources, data_dir: pathlib.Path) -> None:
    """
    Set metadata for an archive from the Alaska Division of Geological & Geophysical Surveys.
    """
    metadata: dict[str, str] = {}
    metadata_files = list(data_dir.glob("metadata/*.txt"))

    ## NOTE: The metadata file looks like it could be parsed as YAML,
    ## but alas, it is not YAML. Some would-be hashes define a key multiple
    ## times, and some values confuse PyYAML's parser.

    if len(metadata_files) != 1:
        return
    with open(metadata_files[0], encoding="utf-8") as fp:
        raw_metadata = fp.readlines()

    ## Skip the first line ("Identification_Information:").

    raw_metadata.pop(0)

    ## Scan for interesting lines until we reach the next section.

    for line in raw_metadata:
        if not line.startswith(" ") or "Description:" in line:
            break
        line = line.strip()

        if match := re.match(r"(\s*)Originator:(\s*)", line):
            author = match.group(2).strip()
            if "authors" in metadata:
                metadata["authors"] += f"; {author}"
            else:
                metadata["authors"] = author
        if match := re.match(r"(\s*)Publication_Date:(\s*)", line):
            metadata["ref_year"] = match.group(2).strip()
        if match := re.match(r"(\s*)Title:(\s*)", line):
            title = match.group(2).strip()
            metadata["name"] = title
            metadata["ref_title"] = title
        if match := re.match(r"(\s*)Publisher:(\s*)", line):
            metadata["ref_source"] = match.group(2).strip()
        if match := re.match(r"(\s*)Online_Linkage:(\s*)", line):
            metadata["isbn_doi"] = match.group(2).strip()

    if metadata:
        update_source(source.source_id, **metadata)


# --------------------------------------------------------------------------
# Querying the database.


def get_db_session(expire_on_commit=False) -> Session:
    # NOTE: By default, let ORM objects persist past commits, and let
    # consumers manage concurrent updates.
    db = get_database()
    return Session(db.engine, expire_on_commit=expire_on_commit)


def get_object(bucket: str, key: str) -> Optional[Object]:
    with get_db_session() as session:
        obj = session.scalar(
            select(Object).where(
                and_(
                    Object.scheme == SchemeEnum.s3,
                    Object.host == config.S3_HOST,
                    Object.bucket == bucket,
                    Object.key == key,
                    Object.deleted_on == None,
                )
            )
        )
    return obj


def create_object(**data) -> Object:
    data = data.copy()
    data["created_on"] = datetime.datetime.utcnow()
    with get_db_session() as session:
        new_obj = session.scalar(insert(Object).values(**data).returning(Object))
        session.commit()
    return new_obj


def update_object(id_: int, **data) -> Object:
    data = data.copy()
    data["updated_on"] = datetime.datetime.utcnow()
    with get_db_session() as session:
        new_obj = session.scalar(
            update(Object).values(**data).where(Object.id == id_).returning(Object)
        )
        session.commit()
    return new_obj


def get_ingest_process_by_object_group_id(id_: int) -> Optional[IngestProcess]:
    with get_db_session() as session:
        ingest_process = session.scalar(
            select(IngestProcess).where(IngestProcess.object_group_id == id_),
        )
    return ingest_process


def get_ingest_process_by_source_id(id_: int) -> Optional[IngestProcess]:
    with get_db_session() as session:
        ingest_process = session.scalar(
            select(IngestProcess).where(IngestProcess.source_id == id_),
        )
    return ingest_process


def create_ingest_process(**data) -> IngestProcess:
    data = data.copy()
    data["created_on"] = datetime.datetime.utcnow()
    with get_db_session() as session:
        if not (
            object_group := session.scalar(insert(ObjectGroup).returning(ObjectGroup))
        ):
            raise IngestError("Failed to create a new object group")
        new_ingest_process = session.scalar(
            insert(IngestProcess)
            .values(object_group_id=object_group.id, **data)
            .returning(IngestProcess)
        )
        session.commit()
    return new_ingest_process


def update_ingest_process(id_: int, **data) -> IngestProcess:
    with get_db_session() as session:
        new_ingest_process = session.scalar(
            update(IngestProcess)
            .values(**data)
            .where(IngestProcess.id == id_)
            .returning(IngestProcess)
        )
        session.commit()
    return new_ingest_process


def create_ingest_process_tag(ingest_process_id: int, tag: str) -> IngestProcessTag:
    with get_db_session() as session:
        new_ingest_process_tag = session.scalar(
            insert(IngestProcessTag)
            .values(ingest_process_id=ingest_process_id, tag=tag)
            .returning(IngestProcessTag)
        )
        session.commit()
    return new_ingest_process_tag


def get_source_by_id(id_: int) -> Optional[Sources]:
    with get_db_session() as session:
        source = session.scalar(select(Sources).where(Sources.source_id == id_))
    return source


def get_source_by_slug(slug: str) -> Optional[Sources]:
    with get_db_session() as session:
        source = session.scalar(select(Sources).where(Sources.slug == slug))
    return source


def create_source(**data) -> Sources:
    data = truncate_source_metadata(data)
    print(data)
    with get_db_session() as session:
        new_source = session.scalar(
            insert(Sources).values(**data).returning(Sources),
        )
        session.commit()
    return new_source


def update_source(id_: int, **data) -> Sources:
    data = truncate_source_metadata(data)
    with get_db_session() as session:
        new_source = session.scalar(
            update(Sources)
            .values(**data)
            .where(Sources.source_id == id_)
            .returning(Sources),
        )
        session.commit()
    return new_source


# --------------------------------------------------------------------------
# Creating and ingesting a single slug (a.k.a. map).


def create_slug(
    slug: Annotated[
        str,
        Argument(help="The slug to use for this map"),
    ],
    *,
    name: Annotated[
        Optional[str],
        Option(help="The map's name"),
    ] = None,
    tag: Annotated[
        Optional[list[str]],
        Option(help="A tag to apply to the map"),
    ] = None,
    ref_title: Annotated[
        Optional[str],
        Option(help="The map's report's title"),
    ] = None,
    ref_authors: Annotated[
        Optional[str],
        Option(help="The map's report's authors"),
    ] = None,
    ref_year: Annotated[
        Optional[str],
        Option(help="The map's report's year"),
    ] = None,
    ref_source: Annotated[
        Optional[str],
        Option(help="The map's report's source"),
    ] = None,
    ref_isbn_or_doi: Annotated[
        Optional[str],
        Option(help="The map's report's ISBN or DOI"),
    ] = None,
    scale: Annotated[
        str,
        Option(help="The map's scale"),
    ] = "large",
    website_url: Annotated[
        Optional[str],
        Option(help="The URL for the map's canonical landing page"),
    ] = None,
    raster_url: Annotated[
        Optional[str],
        Option(help="The URL for the map's raster file"),
    ] = None,
) -> tuple[Sources, IngestProcess]:
    """
    Ensure that a map exists in the database with the provided metadata.
    """

    ## Normalize identifiers.

    slug = normalize_slug(slug)
    console.print(f"Normalized the provided slug to {slug}")

    ## Create the `sources` record.

    metadata = {
        "slug": slug,
        "primary_table": f"{slug}_polygons",
        "scale": scale,
    }
    if name:
        metadata["name"] = name
    if website_url:
        metadata["url"] = website_url
    if ref_title:
        metadata["ref_title"] = ref_title
    if ref_authors:
        metadata["authors"] = ref_authors
    if ref_year:
        metadata["ref_year"] = ref_year
    if ref_source:
        metadata["ref_source"] = ref_source
    if ref_isbn_or_doi:
        metadata["isbn_doi"] = ref_isbn_or_doi
    if raster_url:
        metadata["raster_url"] = raster_url

    if source := get_source_by_slug(slug):
        console.print(f"Found existing source ID {source.source_id} for slug {slug}")
        source = update_source(source.source_id, **metadata)
    else:
        source = create_source(**metadata)
    console.print(f"Created or updated source ID {source.source_id}")

    ## Create the `ingest_process` record.

    if not (ingest_process := get_ingest_process_by_source_id(source.source_id)):
        ingest_process = create_ingest_process(source_id=source.source_id)
    for t in tag or []:
        create_ingest_process_tag(ingest_process.id, t)
    console.print(f"Created or updated ingest process ID {ingest_process.id}")

    return (source, ingest_process)


def ingest_slug(
    map_info: MapInfo,
    *,
    filter: Annotated[
        Optional[str],
        Option(help="How to interpret the contents of the map's objects"),
    ] = None,
    embed: Annotated[bool, Option(help="Embed a shell for debugging")] = False,
) -> Sources:
    """
    Ingest a map from its already uploaded files.
    """
    source = get_source_by_id(map_info.id)
    ingest_process = get_ingest_process_by_source_id(map_info.id)

    if not source or not ingest_process:
        raise IngestError(f"Internal data model error for map {map_info}")

    with get_db_session() as session:
        objs = session.scalars(
            select(Object).where(
                and_(
                    Object.object_group_id == ingest_process.object_group_id,
                    Object.deleted_on == None,
                )
            )
        ).all()

    for i, obj in enumerate(objs):
        append_data = i != 0
        try:
            load_object(
                obj.bucket, obj.key, filter=filter, append_data=append_data, embed=embed
            )
        except Exception as exn:
            raise_ingest_error(ingest_process, str(exn), exn)

    ## Prepare points, lines, and polygons tables for human review.

    console.print(f"Preparing map {map_info}")
    try:
        prepare_fields(map_info)
        ingest_process = update_ingest_process(
            ingest_process.id, state=IngestState.prepared
        )
        create_rgeom(map_info)
        create_webgeom(map_info)
        ingest_process = update_ingest_process(
            ingest_process.id, state=IngestState.ingested
        )
    except Exception as exn:
        raise_ingest_error(ingest_process, str(exn), exn)

    return source


# --------------------------------------------------------------------------
# Working with files and objects.


def upload_file(
    slug: Annotated[
        str,
        Argument(help="The slug to use for this map"),
    ],
    local_file: Annotated[
        pathlib.Path,
        Argument(help="The local archive file to upload"),
    ],
    *,
    compress: Annotated[
        bool,
        Option(help="Whether to compress the file before uploading"),
    ] = False,
    s3_prefix: Annotated[
        str,
        Option(help="The prefix to use for the file's S3 key"),
    ] = "",
    s3_bucket: Annotated[
        str,
        Option(help="The S3 bucket to upload the file to"),
    ] = default_s3_bucket,
    name: Annotated[
        Optional[str],
        Option(help="The map's name"),
    ] = None,
    tag: Annotated[
        Optional[list[str]],
        Option(help="A tag to apply to the map"),
    ] = None,
    ref_title: Annotated[
        Optional[str],
        Option(help="The map's report's title"),
    ] = None,
    ref_authors: Annotated[
        Optional[str],
        Option(help="The map's report's authors"),
    ] = None,
    ref_year: Annotated[
        Optional[str],
        Option(help="The map's report's year"),
    ] = None,
    ref_source: Annotated[
        Optional[str],
        Option(help="The map's report's source"),
    ] = None,
    ref_isbn_or_doi: Annotated[
        Optional[str],
        Option(help="The map's report's ISBN or DOI"),
    ] = None,
    scale: Annotated[
        str,
        Option(help="The map's scale"),
    ] = "large",
    archive_url: Annotated[
        Optional[str],
        Option(help="The URL for the archive file"),
    ] = None,
    website_url: Annotated[
        Optional[str],
        Option(help="The URL for the map's canonical landing page"),
    ] = None,
    raster_url: Annotated[
        Optional[str],
        Option(help="The URL for the map's raster file"),
    ] = None,
) -> Object:
    """
    Upload a local archive file for a map to the object store.
    """

    s3 = get_minio_client()
    bucket = s3_bucket
    assert bucket is not None

    if s3_prefix.endswith("/"):
        s3_prefix = s3_prefix[:-1]

    ## Normalize identifiers.

    slug = normalize_slug(slug)
    console.print(f"Normalized the provided slug to {slug}")

    out_name = local_file.name

    if local_file.is_dir() and not compress:
        # Special handling for Geodatabases
        if local_file.suffix.endswith(".gdb"):
            compress = True

    if local_file.is_dir() and not compress:
        raise IngestError("Cannot ingest a directory")

    if compress:
        console.print(f"Compressing {local_file}")
        out_name = f"{local_file.name}.tar.gz"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tar.gz") as tf:
            with tarfile.open(tf.name, "w:gz") as tf:
                tf.add(local_file, arcname=local_file.name)
        local_file = pathlib.Path(tf.name)

    ## Create or update the `sources` and `ingest_process` records.

    (_, ingest_process) = create_slug(
        slug,
        name=name,
        tag=tag,
        ref_title=ref_title,
        ref_authors=ref_authors,
        ref_year=ref_year,
        ref_source=ref_source,
        ref_isbn_or_doi=ref_isbn_or_doi,
        scale=scale,
        website_url=website_url,
        raster_url=raster_url,
    )

    console.print(f"Created record for map {slug}")

    ## Collect metadata for the archive file.

    mime_type = magic.Magic(mime=True).from_file(local_file)
    hasher = hashlib.sha256()
    with open(local_file, mode="rb") as fp:
        while data := fp.read(config.CHUNK_SIZE):
            hasher.update(data)
    sha256_hash = hasher.hexdigest()
    console.print(f"Detected {mime_type} with SHA-256 {sha256_hash}")

    ## Upload the file.

    bucket = s3_bucket
    key = f"{s3_prefix}/{slug}/{out_name}"

    obj = get_object(bucket, key)

    if not obj or sha256_hash != obj.sha256_hash:
        console.print(f"Uploading {out_name} to S3 as {bucket}/{key}")
        s3.fput_object(bucket, key, str(local_file))
        ingest_process = update_ingest_process(
            ingest_process.id, state=IngestState.pending
        )
        console.print("Finished upload")
    else:
        console.print("Object with the same SHA-256 already present in S3")

    ## Create or update the object's DB entry.

    source_info = {}
    if archive_url:
        source_info["archive_url"] = archive_url
    if raster_url:
        source_info["raster_url"] = raster_url
    if website_url:
        source_info["website_url"] = website_url

    payload = {
        "object_group_id": ingest_process.object_group_id,
        "scheme": SchemeEnum.s3,
        "host": config.S3_HOST,
        "bucket": bucket,
        "key": key,
        "source": source_info,
        "mime_type": mime_type,
        "sha256_hash": sha256_hash,
    }

    if obj:
        obj = update_object(obj.id, **payload)
    else:
        obj = create_object(**payload)
    console.print(f"Created or updated object ID {obj.id}")

    return obj


def load_object(
    bucket: Annotated[
        str,
        Argument(help="The object's bucket"),
    ],
    key: Annotated[
        str,
        Argument(help="The object's key"),
    ],
    *,
    filter: Annotated[
        Optional[str],
        Option(help="How to interpret the contents of the object"),
    ] = None,
    append_data: Annotated[
        bool,
        Option(
            help="Whether to append data to the associated map when it already exists"
        ),
    ] = False,
    embed: Annotated[bool, Option(help="Embed a shell for debugging")] = False,
) -> Object:
    """
    Ingest an object in S3 containing a map into Macrostrat.

    Assumes that database records for the `sources` and `ingest_process`
    tables have already been created.
    """
    if not (obj := get_object(bucket, key)):
        raise IngestError(f"No such object in the database: {bucket}/{key}")
    if not (
        ingest_process := get_ingest_process_by_object_group_id(obj.object_group_id)
    ):
        raise IngestError(f"No ingest process in the database for object ID {obj.id}")
    if not (source := get_source_by_id(ingest_process.source_id)):
        raise_ingest_error(
            ingest_process,
            "No source ID in the database for ingest process ID {ingest_process.id}",
        )

    ## Normalize the filter.

    if filter:
        filter = filter.lower()

    ## Download the object to a local, temporary file.

    s3 = get_minio_client()

    obj_basename = key.split("/")[-1]
    fd, local_filename = tempfile.mkstemp(suffix=f"-{obj_basename}")
    os.close(fd)
    local_file = pathlib.Path(local_filename)

    console.print(f"Downloading archive into {local_file}")
    s3.fget_object(bucket, key, str(local_file))
    console.print("Finished downloading archive")

    ## Process anything that might have points, lines, or polygons.

    try:
        with ingestion_context(local_file, ignore_cleanup_errors=True) as tmp_dir:

            ## Locate files of interest.

            gis_files = (
                list(tmp_dir.glob("**/*.gdb"))
                + list(tmp_dir.glob("**/*.geojson"))
                + list(tmp_dir.glob("**/*.gpkg"))
                + list(tmp_dir.glob("**/*.shp"))
            )
            gis_data = []
            excluded_data = []

            for gis_file in gis_files:
                if filter == "polymer":
                    if (
                        gis_file.name.startswith("polymer")
                        and "_bbox" not in gis_file.name
                        and "_legend" not in gis_file.name
                    ):
                        gis_data.append(gis_file)
                    else:
                        excluded_data.append(gis_file)
                elif filter == "ta1":
                    if "_bbox" not in gis_file.name and "_legend" not in gis_file.name:
                        gis_data.append(gis_file)
                    else:
                        excluded_data.append(gis_file)
                else:
                    gis_data.append(gis_file)

            if not gis_data:
                raise_ingest_error(ingest_process, "Failed to locate GIS data")

            ## Process the GIS files.

            console.print(f"Loading into {source.slug}")
            console.print(f"Loading {strify_list(gis_data)}")
            if excluded_data:
                console.print(
                    f"Skipping over / not loading {strify_list(excluded_data)}"
                )
            console.print(f"Appending data? {append_data}")
            try:
                ingest_map(
                    source.slug,
                    gis_data,
                    if_exists="append" if append_data else "replace",
                    embed=embed,
                )
            except Exception as exn:
                raise_ingest_error(ingest_process, str(exn), exn)

            ## Process any other data of interest.

            try:
                if filter == "alaska":
                    update_alaska_metadata(source, tmp_dir)
            except Exception as exn:
                raise_ingest_error(ingest_process, str(exn), exn)
    except Exception as exn:
        raise_ingest_error(ingest_process, str(exn), exn)
    finally:
        local_file.unlink()

    return obj


@contextmanager
def ingestion_context(local_file, *, ignore_cleanup_errors=False) -> list[pathlib.Path]:
    """Copy or extract a local file into a temporary directory for ingestion."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=ignore_cleanup_errors) as td:
        tmp_dir = pathlib.Path(td)

        if is_archive(local_file):
            console.print(f"Extracting archive into {tmp_dir}")
            extract_archive(local_file, tmp_dir)
        else:
            shutil.copy(local_file, tmp_dir)

        yield tmp_dir


# --------------------------------------------------------------------------
# Creating and ingesting multiple slugs (a.k.a. maps).


def ingest_csv(
    csv_file: Annotated[
        pathlib.Path,
        Argument(help="CSV file containing arguments for upload-file"),
    ],
    download_dir: Annotated[
        pathlib.Path,
        Option(help="Directory into which to download the maps' archive files"),
    ],
    *,
    s3_bucket: Annotated[
        str,
        Option(help="The S3 bucket to upload the files to"),
    ] = default_s3_bucket,
    s3_prefix: Annotated[
        str,
        Option(help="The prefix, sans trailing slash, to use for the files' S3 keys"),
    ] = None,
    tag: Annotated[
        Optional[list[str]],
        Option(help="A tag to apply to the maps"),
    ] = None,
    filter: Annotated[
        Optional[str],
        Option(help="How to interpret the contents of the maps' files"),
    ] = None,
) -> None:
    """
    Ingest multiple maps from their descriptions in a CSV file.

    This command enables the bulk ingest of maps by specifying values for
    arguments and options to the upload-file command, with each row in the
    CSV file corresponding to one file. Once all files have been uploaded,
    each resulting map will be processed with ingest-map.

    The first row of the CSV file should be a header listing the names of
    arguments and options to the upload-file subcommand, with hyphens being
    replaced by underscores.

    Instead of the "local_file" argument, there must be a column for
    "archive_url", which is where to download the map's archive file from.

    There must also be a column for "slug".
    """
    slugs_seen = []

    with open(csv_file, mode="r", encoding="utf-8", newline="") as input_fp:
        reader = csv.DictReader(input_fp)

        for row in reader:
            url = row["archive_url"]
            filename = url.split("/")[-1]

            download_dir_for_slug = download_dir / row["slug"]
            download_dir_for_slug.mkdir(parents=True, exist_ok=True)

            partial_local_file = download_dir_for_slug / (filename + ".partial")
            local_file = download_dir_for_slug / filename

            if not local_file.exists():
                console.print(f"Downloading {url}")
                response = requests.get(url, stream=True, timeout=config.TIMEOUT)

                if not response.ok:
                    console.print(f"Failed to download {url}")
                    continue

                with open(partial_local_file, mode="wb") as local_fp:
                    for chunk in response.iter_content(chunk_size=config.CHUNK_SIZE):
                        local_fp.write(chunk)
                partial_local_file.rename(local_file)

            kwargs = {}
            for f in set(FIELDS) - {"slug"}:
                if row.get(f):
                    kwargs[f] = row[f]
            if tag:
                kwargs["tag"] = tag

            upload_file(
                row["slug"],
                local_file,
                s3_bucket=s3_bucket,
                s3_prefix=s3_prefix,
                **kwargs,  # type: ignore[arg-type]
            )
            slugs_seen.append(row["slug"])

    ## Ingest only those maps with successful uploads.
    db = get_database()

    for slug in set(slugs_seen):
        try:
            ingest_slug(get_map_info(db, slug), filter=filter)
        except Exception as exn:
            console.print(f"Exception while attempting to ingest a CSV file: {exn}")


def run_polling_loop(
    polling_interval: Annotated[
        int,
        Argument(help="How often to poll, in seconds"),
    ] = 60,
) -> None:
    """
    Poll for and process pending maps.
    """
    while True:
        console.print("Starting iteration of polling loop")
        bad_pending = 0

        db = get_database()

        with get_db_session() as session:
            for ingest_process in session.scalars(
                select(IngestProcess).where(IngestProcess.state == IngestState.pending)
            ).unique():
                if ingest_process.source_id:
                    map_info = get_map_info(db, ingest_process.source_id)
                    console.print(f"Processing {map_info}")
                    try:
                        ingest_slug(map_info)
                    except Exception as exn:
                        record_ingest_error(ingest_process, str(exn))
                else:
                    bad_pending += 1

        if bad_pending:
            console.print(
                f"Skipped {bad_pending} ingests because of a missing source_id"
            )
        console.print("Finished iteration of polling loop")
        time.sleep(polling_interval)